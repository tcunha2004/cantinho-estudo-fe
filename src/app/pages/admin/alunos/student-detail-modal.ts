import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { StudentDetailDto } from '../../../model/dto/student-detail.dto';
import { StudentService, UpdateStudentPayload } from '../../../service/student.service';
import { RegionService } from '../../../service/region.service';
import { CONTRACT_STATUS_DISPLAY, PLAN_DISPLAY } from '../../../shared/domain-display';
import { Icon } from '../../../shared/icon/icon';
import { initials } from '../../../shared/initials';
import { Modal } from '../../../shared/modal/modal';

/**
 * Visualização e edição de um aluno para o admin. Nasce em modo leitura;
 * "Editar" troca para um formulário reaproveitando os dados já carregados.
 * Inativar tem confirmação inline, no mesmo esquema do `ClassDetailsModal`.
 *
 * Este é o lugar único pra editar tudo do aluno: dados cadastrais, contrato
 * atual (plano/desconto/status) e responsável financeiro.
 */
@Component({
  selector: 'app-student-detail-modal',
  imports: [Icon, Modal, ReactiveFormsModule],
  templateUrl: './student-detail-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentDetailModal {
  readonly studentId = input.required<string>();

  readonly closed = output<void>();
  readonly changed = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly studentService = inject(StudentService);
  private readonly regionService = inject(RegionService);
  private readonly modal = viewChild.required(Modal);

  protected readonly planDisplay = PLAN_DISPLAY;
  protected readonly contractStatus = CONTRACT_STATUS_DISPLAY;
  protected readonly initials = initials;

  protected readonly regions = toSignal(this.regionService.getPricing(), { initialValue: [] });

  protected readonly item = rxResource({
    params: () => this.studentId(),
    stream: ({ params }) => this.studentService.getById(params),
  });

  /* Contrato mais recente (histórico vem ordenado assim pelo backend) — é o
   * único que a edição toca. */
  protected readonly currentContract = computed(() => this.item.value()?.contracts[0] ?? null);

  /* Mesmo critério do backend: financeiro, ou o primeiro se nenhum for. */
  protected readonly pickedGuardian = computed(() => {
    const guardians = this.item.value()?.guardians ?? [];
    return guardians.find((guardian) => guardian.isFinancialResponsible) ?? guardians[0] ?? null;
  });

  protected readonly editing = signal(false);
  protected readonly confirmingInactivate = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    address: [''],
    regionId: ['', Validators.required],
    planId: [''],
    discountPercentage: [''],
    contractStatus: ['active' as 'active' | 'cancelled'],
    guardianName: [''],
    guardianPhone: [''],
    guardianCpf: [''],
    guardianIsFinancialResponsible: [false],
  });

  /*
   * Região usada para filtrar o select de plano. Não dá pra ler isso de
   * `regionId.valueChanges` via `toSignal`: a carga inicial usa `patchValue`
   * com `emitEvent: false` de propósito (pra não disparar o reset de plano
   * abaixo), e isso também faria o `valueChanges` nunca emitir o valor
   * carregado — o select de plano ficaria sempre vazio. Por isso é um sinal
   * separado, atualizado nos dois casos (carga inicial e troca real).
   */
  protected readonly pickedRegionId = signal('');

  /* Planos são escolhidos dentro da região do aluno — mesma regra que
   * `findOtherPlans` usa no backend. */
  protected readonly availablePlans = computed(
    () => this.regions().find((region) => region.id === this.pickedRegionId())?.plans ?? [],
  );

  constructor() {
    /* Só dispara em interação real do usuário — a carga inicial usa
     * patchValue com emitEvent:false e atualiza pickedRegionId direto. */
    this.form.controls.regionId.valueChanges.pipe(takeUntilDestroyed()).subscribe((regionId) => {
      this.pickedRegionId.set(regionId);
      this.form.controls.planId.setValue('');
    });
  }

  protected startEdit(student: StudentDetailDto): void {
    const contract = this.currentContract();
    const guardian = this.pickedGuardian();

    this.form.patchValue(
      {
        name: student.name,
        email: student.email,
        phone: student.phone,
        address: student.address ?? '',
        regionId: student.region.id,
        planId: contract?.planId ?? '',
        discountPercentage: contract?.discountPercentage ?? '',
        contractStatus: contract?.status ?? 'active',
        guardianName: guardian?.name ?? '',
        guardianPhone: guardian?.phone ?? '',
        guardianCpf: guardian?.cpf ?? '',
        guardianIsFinancialResponsible: guardian?.isFinancialResponsible ?? false,
      },
      { emitEvent: false },
    );
    /*
     * O plano do contrato pode ser de uma região diferente da região
     * cadastrada do aluno (o seed já permite isso, com só um aviso) — então o
     * select de plano tem que filtrar pela região onde o plano ATUAL
     * realmente está, não pela região do aluno. Senão o plano nunca aparece
     * pré-selecionado quando as duas regiões divergem.
     */
    const planRegionId = contract
      ? this.regions().find((region) => region.plans.some((plan) => plan.id === contract.planId))
          ?.id
      : undefined;
    this.pickedRegionId.set(planRegionId ?? student.region.id);
    this.errorMessage.set(null);
    this.editing.set(true);
  }

  protected cancelEdit(): void {
    this.editing.set(false);
    this.errorMessage.set(null);
  }

  protected close(): void {
    this.modal().close();
  }

  protected handleSubmit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const {
      name,
      email,
      phone,
      address,
      regionId,
      planId,
      discountPercentage,
      contractStatus,
      guardianName,
      guardianPhone,
      guardianCpf,
      guardianIsFinancialResponsible,
    } = this.form.getRawValue();

    const payload: UpdateStudentPayload = {
      name,
      email,
      phone,
      address: address.trim() || null,
      regionId,
      ...(this.currentContract()
        ? {
            /* Trocar de região limpa o select de plano (os planos são por
             * região). Sem plano escolhido, mantém o do contrato atual — em
             * vez de mandar string vazia, que o backend recusa com 400. */
            ...(planId ? { planId } : {}),
            /* `input[type=number]` entrega número, não texto: o backend espera
             * um decimal em string ("10.50"). */
            discountPercentage: String(discountPercentage ?? '').trim() || null,
            contractStatus,
          }
        : {}),
      ...(this.pickedGuardian()
        ? {
            guardian: {
              name: guardianName,
              phone: guardianPhone,
              cpf: guardianCpf,
              isFinancialResponsible: guardianIsFinancialResponsible,
            },
          }
        : {}),
    };

    this.save(payload, () => this.editing.set(false));
  }

  protected confirmInactivate(): void {
    this.save({ active: false }, () => this.confirmingInactivate.set(false));
  }

  private save(payload: UpdateStudentPayload, onSuccess: () => void): void {
    this.saving.set(true);
    this.errorMessage.set(null);

    this.studentService.update(this.studentId(), payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.item.reload();
        this.changed.emit();
        onSuccess();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.errorMessage.set(this.toMessage(error));
      },
    });
  }

  private toMessage(error: HttpErrorResponse): string {
    const message = (error.error as { message?: string | string[] } | null)?.message;

    if (Array.isArray(message)) {
      return message[0];
    }

    return message ?? 'Não foi possível salvar o aluno. Tente novamente.';
  }
}

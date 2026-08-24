import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PlanPricingDto } from '../../model/dto/plan-pricing.dto';
import { SignupDraftPayload, SignupFormDto } from '../../model/dto/signup-form.dto';
import { SignupGuardian } from '../../model/entity/signup-link.model';
import { SignupLinkService } from '../../service/signup-link.service';
import { PLAN_DISPLAY, planPriceView } from '../../shared/domain-display';
import { Icon } from '../../shared/icon/icon';
import { passwordsMatch } from '../../shared/passwords-match';

const PHASES = ['Dados do aluno', 'Responsáveis', 'Plano', 'Revisão'] as const;

/**
 * Cadastro do aluno pelo link que o admin enviou. Tela pública: quem preenche
 * ainda não existe no sistema, então não há sessão — o segredo é o próprio id
 * do link.
 *
 * O formulário anda por fases e cada "Próximo" salva a fase no backend, então
 * fechar a aba não custa o que já foi preenchido. Nada vira aluno aqui: o envio
 * apenas deixa o cadastro aguardando a aprovação do admin.
 */
@Component({
  selector: 'app-cadastro',
  imports: [CurrencyPipe, Icon, ReactiveFormsModule],
  templateUrl: './cadastro.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Cadastro {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly signupLinkService = inject(SignupLinkService);

  protected readonly phases = PHASES;
  protected readonly planDisplay = PLAN_DISPLAY;
  /* Nem todo plano é mensalidade — ver planPriceView. */
  protected readonly priceView = planPriceView;

  private readonly linkId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly phase = signal(0);
  protected readonly saving = signal(false);
  protected readonly sent = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  /* Qual responsável é o financeiro — é rádio, então é sempre exatamente um. */
  protected readonly financialIndex = signal(0);

  /*
   * Espelham os controles de região e plano. Não dá para ler isso de
   * `valueChanges`: a carga do rascunho usa `patchValue`, e um `emitEvent`
   * disparado ali reiniciaria a escolha de plano no meio da restauração.
   */
  private readonly pickedRegionId = signal('');
  private readonly pickedPlanId = signal('');

  protected readonly form = this.fb.nonNullable.group({
    dados: this.fb.nonNullable.group(
      {
        studentName: ['', [Validators.required, Validators.minLength(3)]],
        studentEmail: ['', [Validators.required, Validators.email]],
        studentPhone: ['', [Validators.required, Validators.minLength(8)]],
        studentAddress: [''],
        regionId: ['', Validators.required],
        password: ['', [Validators.required, Validators.minLength(6)]],
        passwordConfirm: ['', Validators.required],
      },
      { validators: passwordsMatch },
    ),
    responsaveis: this.fb.nonNullable.group({
      guardians: this.fb.nonNullable.array([this.guardianGroup()]),
    }),
    plano: this.fb.nonNullable.group({
      planId: ['', Validators.required],
    }),
  });

  protected readonly guardians = this.form.controls.responsaveis.controls.guardians;

  private readonly draft = rxResource({
    params: () => this.linkId,
    stream: ({ params }) => this.signupLinkService.getForm(params),
  });

  protected readonly loading = this.draft.isLoading;

  /* 404 (link inexistente) e 410 (já enviado) são telas, não erro de sistema. */
  protected readonly loadError = computed(() => {
    const error = this.draft.error() as HttpErrorResponse | undefined;

    if (!error) {
      return null;
    }

    return error.status === 410
      ? 'Este cadastro já foi enviado. Aguarde o contato da escola.'
      : 'Link de cadastro inválido ou não encontrado.';
  });

  /* `value()` estoura quando o resource está em erro — só lê se resolveu. */
  protected readonly regions = computed(() =>
    this.draft.hasValue() ? this.draft.value().regions : [],
  );

  protected readonly pickedRegion = computed(() =>
    this.regions().find((region) => region.id === this.pickedRegionId()),
  );

  /* Planos são por região: a fase de plano depende da região da fase 1. */
  protected readonly availablePlans = computed(() => this.pickedRegion()?.plans ?? []);

  protected readonly pickedPlan = computed(() =>
    this.availablePlans().find((plan) => plan.id === this.pickedPlanId()),
  );

  /*
   * Contador de revalidações do formulário — é o que faz o "Próximo" reagir ao
   * último campo preenchido. Não dá para observar o `status` do formulário
   * inteiro: ele continua "INVALID" enquanto as fases seguintes estão vazias,
   * o valor nunca muda e o `computed` jamais recalcularia a fase atual.
   */
  private readonly formRevision = signal(0);

  protected readonly currentPhaseValid = computed(() => {
    this.formRevision();
    return this.phase() === 3 ? this.form.valid : this.currentGroup().valid;
  });

  constructor() {
    /* Restaura o que já foi salvo — o aluno pode ter fechado a aba antes. */
    effect(() => {
      if (this.draft.hasValue()) {
        this.restore(this.draft.value());
      }
    });

    /*
     * Só dispara em troca real de região: a restauração do rascunho usa
     * `patchValue` com `emitEvent: false` e acerta os sinais na mão — senão o
     * plano salvo seria apagado no instante em que a tela carrega.
     */
    this.form.statusChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.formRevision.update((revision) => revision + 1));

    this.form.controls.dados.controls.regionId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((regionId) => {
        this.pickedRegionId.set(regionId);
        /* Cada região tem os planos dela: trocar invalida o que foi escolhido. */
        this.form.controls.plano.controls.planId.setValue('');
        this.pickedPlanId.set('');
      });
  }

  protected planLabel(plan: PlanPricingDto): string {
    const { label } = this.planDisplay[plan.planType];
    return plan.frequency ? `${label} · ${plan.frequency}x por semana` : label;
  }

  protected pickPlan(planId: string): void {
    this.form.controls.plano.controls.planId.setValue(planId);
    this.pickedPlanId.set(planId);
  }

  protected addGuardian(): void {
    this.guardians.push(this.guardianGroup());
  }

  protected removeGuardian(index: number): void {
    this.guardians.removeAt(index);

    if (this.financialIndex() >= this.guardians.length) {
      this.financialIndex.set(0);
    }
  }

  protected currentGroup(): FormGroup {
    return [this.form.controls.dados, this.form.controls.responsaveis, this.form.controls.plano][
      Math.min(this.phase(), 2)
    ];
  }

  protected back(): void {
    this.phase.update((current) => Math.max(0, current - 1));
    this.errorMessage.set(null);
  }

  /* Só volta para fase já visitada — avançar é sempre pelo "Próximo". */
  protected goTo(index: number): void {
    if (index < this.phase()) {
      this.phase.set(index);
      this.errorMessage.set(null);
    }
  }

  protected next(): void {
    const group = this.currentGroup();

    if (group.invalid) {
      group.markAllAsTouched();
      return;
    }

    this.save(this.phasePayload(), () => this.phase.update((current) => current + 1));
  }

  protected submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    this.signupLinkService.submit(this.linkId).subscribe({
      next: () => {
        this.saving.set(false);
        this.sent.set(true);
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.errorMessage.set(this.toMessage(error));
      },
    });
  }

  protected guardianValues(): SignupGuardian[] {
    return this.guardians.controls.map((control, index) => {
      const { name, phone, cpf, rg } = control.getRawValue();

      return {
        name,
        phone,
        cpf,
        rg: rg.trim() || null,
        isFinancialResponsible: index === this.financialIndex(),
      };
    });
  }

  /* Só o que a fase atual preencheu — o backend faz o merge no rascunho. */
  private phasePayload(): SignupDraftPayload {
    if (this.phase() === 0) {
      const { studentName, studentEmail, studentPhone, studentAddress, regionId, password } =
        this.form.controls.dados.getRawValue();

      return {
        studentName,
        studentEmail,
        studentPhone,
        studentAddress: studentAddress.trim() || null,
        regionId,
        password,
      };
    }

    if (this.phase() === 1) {
      return { guardians: this.guardianValues() };
    }

    return { planId: this.form.controls.plano.controls.planId.value };
  }

  /*
   * Repõe o rascunho no formulário. A senha nunca volta do backend (só o hash
   * fica lá), então quem recarrega a página digita as duas de novo — é o preço
   * de não trafegar senha de volta.
   */
  private restore(draft: SignupFormDto): void {
    this.form.controls.dados.patchValue(
      {
        studentName: draft.studentName ?? '',
        studentEmail: draft.studentEmail ?? '',
        studentPhone: draft.studentPhone ?? '',
        studentAddress: draft.studentAddress ?? '',
        regionId: draft.regionId ?? '',
      },
      { emitEvent: false },
    );
    this.pickedRegionId.set(draft.regionId ?? '');

    if (draft.planId) {
      this.form.controls.plano.controls.planId.setValue(draft.planId, { emitEvent: false });
      this.pickedPlanId.set(draft.planId);
    }

    if (draft.guardians?.length) {
      this.guardians.clear({ emitEvent: false });

      draft.guardians.forEach((guardian, index) => {
        const group = this.guardianGroup();
        group.patchValue({ ...guardian, rg: guardian.rg ?? '' }, { emitEvent: false });
        this.guardians.push(group, { emitEvent: false });

        if (guardian.isFinancialResponsible) {
          this.financialIndex.set(index);
        }
      });
    }
  }

  private save(payload: SignupDraftPayload, onSuccess: () => void): void {
    if (this.saving()) {
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    this.signupLinkService.saveDraft(this.linkId, payload).subscribe({
      next: () => {
        this.saving.set(false);
        onSuccess();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.errorMessage.set(this.toMessage(error));
      },
    });
  }

  private guardianGroup() {
    return this.fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      phone: ['', [Validators.required, Validators.minLength(8)]],
      cpf: ['', [Validators.required, Validators.minLength(11)]],
      rg: [''],
    });
  }

  private toMessage(error: HttpErrorResponse): string {
    const message = (error.error as { message?: string | string[] } | null)?.message;

    if (Array.isArray(message)) {
      return message[0];
    }

    return message ?? 'Não foi possível salvar. Tente novamente.';
  }
}

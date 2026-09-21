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
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, Observable } from 'rxjs';
import { RegionPricingDto } from '../../../model/dto/region-pricing.dto';
import { PlanPricingDto } from '../../../model/dto/plan-pricing.dto';
import {
  RegionService,
  UpdatePlanPayload,
  UpdateRegionPayload,
} from '../../../service/region.service';
import { PLAN_DISPLAY } from '../../../shared/domain-display';
import { Modal } from '../../../shared/modal/modal';

/* Valores em edição, indexados por id de plano. Ficam como string porque é o
 * que o <input> devolve — a conversão é do backend. */
type PlanEdits = Record<string, Partial<Record<keyof UpdatePlanPayload, string>>>;

/**
 * Reajuste dos valores da região selecionada: os planos dela e as duas taxas
 * (matrícula e comissão). Só o que o admin mexeu vai para a API — campo não
 * tocado não entra no PATCH, então uma edição de preço não reescreve a
 * contagem de aulas sem querer.
 */
@Component({
  selector: 'app-plan-edit-modal',
  imports: [Modal],
  templateUrl: './plan-edit-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanEditModal {
  readonly region = input.required<RegionPricingDto>();

  /* Emitido quando algo foi de fato salvo — a tela recarrega os preços. */
  readonly saved = output<void>();
  readonly closed = output<void>();

  private readonly regionService = inject(RegionService);
  private readonly modal = viewChild.required(Modal);

  protected readonly planDisplay = PLAN_DISPLAY;

  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  private readonly planEdits = signal<PlanEdits>({});
  private readonly regionEdits = signal<Partial<Record<keyof UpdateRegionPayload, string>>>({});

  protected readonly plans = computed(() => this.region().plans);

  /* Valor a exibir: o que está sendo editado, ou o que veio do servidor. */
  protected planValue(plan: PlanPricingDto, field: keyof UpdatePlanPayload): string {
    const edited = this.planEdits()[plan.id]?.[field];

    if (edited !== undefined) {
      return edited;
    }

    const original = plan[field];
    return original === null || original === undefined ? '' : String(original);
  }

  protected regionValue(field: keyof UpdateRegionPayload): string {
    return this.regionEdits()[field] ?? this.region()[field];
  }

  protected setPlanField(
    planId: string,
    field: keyof UpdatePlanPayload,
    value: string,
  ): void {
    this.planEdits.update((edits) => ({
      ...edits,
      [planId]: { ...edits[planId], [field]: value },
    }));
  }

  protected setRegionField(field: keyof UpdateRegionPayload, value: string): void {
    this.regionEdits.update((edits) => ({ ...edits, [field]: value }));
  }

  protected close(): void {
    this.modal().close();
  }

  /*
   * Uma requisição por linha alterada, em paralelo. Comparar com o valor
   * original antes de enviar evita PATCH vazio quando o admin abre o campo,
   * digita e desfaz.
   */
  protected save(): void {
    /* `unknown` no elemento porque plano e região devolvem DTOs diferentes — o
     * resultado não é usado, só o "terminou sem erro". */
    const requests: Observable<unknown>[] = this.plans()
      .map((plan) => ({ plan, payload: this.planPayload(plan) }))
      .filter(({ payload }) => Object.keys(payload).length > 0)
      .map(({ plan, payload }) => this.regionService.updatePlan(plan.id, payload));

    const regionPayload = this.regionPayload();

    if (Object.keys(regionPayload).length > 0) {
      requests.push(this.regionService.updateRegion(this.region().id, regionPayload));
    }

    /* Abrir e fechar sem mexer em nada não é erro — só não vira requisição. */
    if (requests.length === 0) {
      this.close();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    forkJoin(requests).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
        this.close();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.errorMessage.set(
          (error.error as { message?: string } | null)?.message ??
            'Não foi possível salvar os valores. Tente novamente.',
        );
      },
    });
  }

  /* Só os campos cujo valor digitado difere do que veio do servidor. */
  private planPayload(plan: PlanPricingDto): UpdatePlanPayload {
    const edits = this.planEdits()[plan.id] ?? {};
    const payload: Record<string, string | number | null> = {};

    for (const [field, value] of Object.entries(edits)) {
      const original = plan[field as keyof UpdatePlanPayload];
      const originalText =
        original === null || original === undefined ? '' : String(original);

      if (value === originalText) {
        continue;
      }

      /* Contagem e validade são inteiros nullable; campo esvaziado vira null. */
      if (field === 'classesCount' || field === 'validityMonths') {
        payload[field] = value === '' ? null : Number(value);
        continue;
      }

      payload[field] = value;
    }

    return payload as UpdatePlanPayload;
  }

  private regionPayload(): UpdateRegionPayload {
    const edits = this.regionEdits();
    const payload: Record<string, string> = {};

    for (const [field, value] of Object.entries(edits)) {
      if (value !== this.region()[field as keyof UpdateRegionPayload]) {
        payload[field] = value;
      }
    }

    return payload as UpdateRegionPayload;
  }
}

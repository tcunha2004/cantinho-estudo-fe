import { Frequency, PlanType } from '../entity/plan.model';

export interface PlanSummaryDto {
  planType: PlanType;
  frequency: Frequency | null;
  monthlyPrice: string;
  hourPrice: string;
  /* Quantidade de aulas no mês */
  classesCount: number | null;
  /* Validade do pacote em meses */
  validityMonths: number | null;
}

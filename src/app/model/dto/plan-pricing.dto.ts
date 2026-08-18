import { Frequency, PlanType } from '../entity/plan.model';

export interface PlanPricingDto {
  id: string;
  planType: PlanType;
  frequency: Frequency | null;
  monthlyPrice: string;
  hourPrice: string;
  /* Quantidade de aulas no mês */
  classesCount: number | null;
  /* Validade do pacote em meses (2 apenas para o Bronze) */
  validityMonths: number | null;
}

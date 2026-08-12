import { PlanPricingDto } from './plan-pricing.dto';

export interface RegionPricingDto {
  id: string;
  name: string;
  slug: string;
  enrollmentFee: string;
  /* Comissão paga ao professor por aula concluída nesta região */
  classCommission: string;
  plans: PlanPricingDto[];
}

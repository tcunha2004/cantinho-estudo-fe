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

/*
 * A mesma tabela como a tela pública de cadastro a recebe: sem a comissão do
 * professor, que é dado de admin (`/regions/pricing`).
 */
export type PublicRegionPricingDto = Omit<RegionPricingDto, 'classCommission'>;

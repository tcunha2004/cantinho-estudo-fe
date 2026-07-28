/* Espelha o JSON serializado de PlanEntity. Decimais chegam como string. */

import { Region } from './region.model';
import { StudentContract } from './student-contract.model';

export type PlanType = 'ouro' | 'prata' | 'bronze' | 'avulsa';

/* Quantidade de aulas por semana — aplica-se apenas ao Plano Ouro. */
export type Frequency = 2 | 3 | 5;

export interface Plan {
  id: string;
  region: Region;
  planType: PlanType;
  frequency: Frequency | null;
  monthlyPrice: string;
  hourPrice: string;
  /* Quantidade de aulas no mês */
  classesCount: number | null;
  /* Validade do pacote em meses (2 apenas para o Bronze) */
  validityMonths: number | null;
  /* Coleção inversa — presente só quando o endpoint a carrega */
  contracts?: StudentContract[];
}

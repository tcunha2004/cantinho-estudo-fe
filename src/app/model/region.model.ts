/* Espelha o JSON serializado de RegionEntity. Decimais chegam como string. */

import { Plan } from './plan.model';
import { Student } from './student.model';

export interface Region {
  id: string;
  name: string;
  slug: string;
  enrollmentFee: string;
  /* Comissão paga ao professor por aula concluída nesta região */
  classCommission: string;
  active: boolean;
  /* Coleções inversas — presentes só quando o endpoint as carrega */
  plans?: Plan[];
  students?: Student[];
}

/* Espelha o JSON serializado de SubjectEntity. */

import { Teacher } from './teacher.model';
import { Class } from './class.model';

export interface Subject {
  id: string;
  name: string;
  /* Coleções inversas — presentes só quando o endpoint as carrega */
  teachers?: Teacher[];
  classes?: Class[];
}

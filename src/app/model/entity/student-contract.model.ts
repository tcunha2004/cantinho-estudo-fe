/* Espelha o JSON serializado de StudentContractEntity. */

import { Student } from './student.model';
import { Plan } from './plan.model';
import { Class } from './class.model';
import { Payment } from './payment.model';

export type ContractStatus = 'active' | 'cancelled' | 'expired';

export interface StudentContract {
  id: string;
  student: Student;
  plan: Plan;
  startDate: string;
  /* Preenchido para Bronze (2 meses) */
  endDate: string | null;
  /* Percentual de desconto aplicado via invite_link */
  discountPercentage: string | null;
  status: ContractStatus;
  /* Coleções inversas — presentes só quando o endpoint as carrega */
  classes?: Class[];
  payments?: Payment[];
}

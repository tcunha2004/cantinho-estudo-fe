import { Frequency, PlanType } from '../entity/plan.model';
import { ContractStatus } from '../entity/student-contract.model';

export interface ActiveStudentDto {
  id: string;
  name: string;
  /* Responsável financeiro (ou o primeiro responsável, se não houver) */
  guardian: string | null;
  /* Dados referentes ao contrato mais recente do aluno */
  plan: PlanType | null;
  frequency: Frequency | null;
  region: string | null;
  contractStatus: ContractStatus | null;
}

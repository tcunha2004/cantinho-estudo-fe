import { ContractStatus } from '../entity/student-contract.model';
import { Frequency, PlanType } from '../entity/plan.model';

/* Espelha o StudentDetailDto do backend — dados completos de um aluno para o
 * modal de visualização/edição do admin. */
export interface StudentDetailDto {
  id: string;
  name: string;
  email: string;
  phone: string;
  /* Endereço para aulas em casa */
  address: string | null;
  active: boolean;
  region: { id: string; name: string };
  guardians: {
    name: string;
    phone: string;
    cpf: string;
    isFinancialResponsible: boolean;
  }[];
  /* Todos os contratos do aluno, mais recente primeiro */
  contracts: {
    id: string;
    planId: string;
    planType: PlanType;
    frequency: Frequency | null;
    status: ContractStatus;
    startDate: string;
    endDate: string | null;
    discountPercentage: string | null;
  }[];
}

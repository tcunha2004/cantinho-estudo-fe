import { Frequency, PlanType } from '../entity/plan.model';
import { ContractStatus } from '../entity/student-contract.model';

export interface StudentPlanDto {
  studentId: string;
  studentName: string;

  /* Dados do plano contratado */
  planType: PlanType;
  frequency: Frequency | null;
  /* Mensalidade do plano, já com o desconto do contrato — o que o aluno paga */
  monthlyPrice: string;
  /* Hora/aula do plano: preço real na avulsa, referência nos demais */
  hourPrice: string;
  /* Quantidade de aulas no mês */
  classesCount: number | null;
  /* Validade do pacote em meses */
  validityMonths: number | null;
  region: string;

  /* Dados do contrato do aluno com esse plano */
  contractId: string;
  contractStatus: ContractStatus;
  startDate: string;
  endDate: string | null;
  /* Percentual de desconto aplicado ao aluno */
  discountPercentage: string | null;
}

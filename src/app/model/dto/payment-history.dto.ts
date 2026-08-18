import { PaymentStatus } from '../entity/payment.model';
import { PlanType } from '../entity/plan.model';

export interface PaymentHistoryDto {
  id: string;
  /* Contrato ao qual a parcela pertence — agrupa o histórico do admin */
  contractId: string;
  /* Valor apurado a partir das aulas faturáveis do mês */
  amount: string;
  /* Vencimento da parcela */
  dueDate: string;
  /* Data do pagamento, nulo se ainda não pago */
  paidAt: string | null;
  status: PaymentStatus;
  /* Tipo do plano do contrato ao qual a parcela pertence */
  planType: PlanType;
  /* Quantas aulas faturáveis compõem o valor da parcela */
  classesCount: number;
}

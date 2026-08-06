import { PaymentStatus } from '../entity/payment.model';
import { PlanType } from '../entity/plan.model';

export interface PaymentHistoryDto {
  id: string;
  /* Valor da parcela */
  amount: string;
  /* Vencimento da parcela */
  dueDate: string;
  /* Data do pagamento, nulo se ainda não pago */
  paidAt: string | null;
  status: PaymentStatus;
  /* Tipo do plano do contrato ao qual a parcela pertence */
  planType: PlanType;
}

/* Espelha o JSON serializado de PaymentEntity. Decimais chegam como string. */

import { StudentContract } from './student-contract.model';

export type PaymentStatus = 'pending' | 'paid' | 'cancelled';

export interface Payment {
  id: string;
  studentContract: StudentContract;
  /* Valor devido/pago nesta parcela */
  amount: string;
  dueDate: string;
  /* null se ainda não pago */
  paidAt: string | null;
  status: PaymentStatus;
}

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Card } from '../../../shared/card/card';
import { StudentService } from '../../../service/student.service';
import { toSignal } from '@angular/core/rxjs-interop';

type PaymentStatus = 'Pago' | 'Em aberto';

interface Payment {
  abbr: string;
  label: string;
  paidAt: string;
  amount: string;
  status: PaymentStatus;
}

@Component({
  selector: 'app-pagamentos',
  imports: [Card],
  templateUrl: './pagamentos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pagamentos {
  private readonly studentService = inject(StudentService);

  protected readonly studentPayments = toSignal(this.studentService.getStudentPaymentHistory());

  protected readonly nextAmount = computed(() => {
    const amount = this.studentPayments()?.find((payment) => payment.status === 'pending')?.amount;
    return Number(amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? '-';
  });

  protected readonly nextDueDate = computed(() => {
    const dueDate = this.studentPayments()?.find(
      (payment) => payment.status === 'pending',
    )?.dueDate;
    return dueDate
      ? new Date(dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      : '-';
  });

  protected readonly paymentsHistory = computed(() => {
    return this.studentPayments()?.map((payment) => ({
      abbr: new Date(payment.dueDate).toLocaleString('pt-BR', { month: 'short' }).toUpperCase(),
      label: new Date(payment.dueDate).toLocaleString('pt-BR', { month: 'long' }),
      paidAt: payment.paidAt ? new Date(payment.paidAt).toLocaleString('pt-BR') : '-',
      amount: Number(payment.amount).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }),
      status: payment.status === 'paid' ? 'Pago' : 'Em aberto',
    })) as Payment[];
  });

  protected readonly payments: Payment[] = this.paymentsHistory() ?? [];

  protected readonly statusStyles: Record<PaymentStatus, string> = {
    Pago: 'bg-subject-green/15 text-subject-green',
    'Em aberto': 'bg-subject-amber/15 text-subject-amber',
  };
}

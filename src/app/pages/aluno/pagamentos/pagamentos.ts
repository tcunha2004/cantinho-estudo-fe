import { CurrencyPipe, DatePipe, UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { StudentService } from '../../../service/student.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { Card } from '../../../shared/card/card';
import { PAYMENT_STATUS_DISPLAY } from '../../../shared/domain-display';
import { PageHeader } from '../../../shared/page-header/page-header';

@Component({
  selector: 'app-pagamentos',
  imports: [Card, PageHeader, CurrencyPipe, DatePipe, UpperCasePipe],
  templateUrl: './pagamentos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pagamentos {
  private readonly studentService = inject(StudentService);

  protected readonly paymentStatus = PAYMENT_STATUS_DISPLAY;
  protected readonly payments = toSignal(this.studentService.getMyPayments(), { initialValue: [] });

  /** Parcela em aberto que vence primeiro — é a que o aluno precisa pagar. */
  protected readonly nextPayment = computed(
    () =>
      this.payments()
        .filter((payment) => payment.status === 'pending')
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .at(0) ?? null,
  );
}

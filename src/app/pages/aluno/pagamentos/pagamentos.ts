import { CurrencyPipe, DatePipe, UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { StudentService } from '../../../service/student.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { Card } from '../../../shared/card/card';
import { paymentStatusDisplay } from '../../../shared/domain-display';
import { todayNaive } from '../../../shared/naive-date';
import { PageHeader } from '../../../shared/page-header/page-header';

@Component({
  selector: 'app-pagamentos',
  imports: [Card, PageHeader, CurrencyPipe, DatePipe, UpperCasePipe],
  templateUrl: './pagamentos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pagamentos {
  private readonly studentService = inject(StudentService);

  protected readonly paymentStatus = paymentStatusDisplay;
  protected readonly payments = toSignal(this.studentService.getMyPayments(), { initialValue: [] });

  /** Parcela em aberto que vence primeiro — é a que o aluno precisa pagar. */
  private readonly nextPayment = computed(
    () =>
      this.payments()
        .filter((payment) => payment.status === 'pending')
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .at(0) ?? null,
  );

  /*
   * O vencimento é o dia 10 do mês de competência, então a parcela em aberto do
   * mês corrente já pode estar vencida — chamar isso de "próximo vencimento" é
   * errado. Os três casos (atrasado, hoje, futuro) têm rótulo e cor próprios.
   */
  protected readonly dueInfo = computed(() => {
    const next = this.nextPayment();

    if (!next) {
      return null;
    }

    const today = todayNaive();

    if (next.dueDate < today) {
      return {
        payment: next,
        title: 'Vencimento em atraso',
        prefix: 'Venceu em',
        tint: 'bg-accent-soft',
      };
    }

    if (next.dueDate === today) {
      return {
        payment: next,
        title: 'Vence hoje',
        prefix: 'Vence em',
        tint: 'bg-subject-amber/12',
      };
    }

    return {
      payment: next,
      title: 'Próximo vencimento',
      prefix: 'Vence em',
      tint: 'bg-accent-soft',
    };
  });
}

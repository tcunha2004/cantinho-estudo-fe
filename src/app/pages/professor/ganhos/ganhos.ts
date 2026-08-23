import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ClassService } from '../../../service/class.service';
import { Card } from '../../../shared/card/card';
import { currentMonth } from '../../../shared/month';
import { PageHeader } from '../../../shared/page-header/page-header';

@Component({
  selector: 'app-ganhos',
  imports: [Card, PageHeader, CurrencyPipe, DatePipe],
  templateUrl: './ganhos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Ganhos {
  private readonly classService = inject(ClassService);

  /* Mês de referência, em `YYYY-MM` — o valor do `<input type="month">` é o
   * mesmo formato que a API espera, então vai direto para a requisição. */
  protected readonly selectedMonth = signal(currentMonth());
  protected readonly maxMonth = currentMonth();

  private readonly monthlyCount = rxResource({
    params: () => this.selectedMonth(),
    stream: ({ params }) => this.classService.getTeacherMonthlyCount(params),
  });
  private readonly monthlyEarnings = rxResource({
    params: () => this.selectedMonth(),
    stream: ({ params }) => this.classService.getTeacherMonthlyEarnings(params),
  });
  private readonly weekly = rxResource({
    params: () => this.selectedMonth(),
    stream: ({ params }) => this.classService.getTeacherWeeklyCounts(params),
  });

  protected readonly lessonsInMonth = computed(() => this.monthlyCount.value() ?? 0);
  protected readonly amountToReceive = computed(() => this.monthlyEarnings.value() ?? 0);
  protected readonly weeklyCounts = computed(() => this.weekly.value() ?? []);

  /** Altura de referência do gráfico: nunca zero, para não dividir por zero. */
  protected readonly busiestWeek = computed(() =>
    Math.max(1, ...this.weeklyCounts().map((week) => week.count ?? 0)),
  );

  /** Só para o `DatePipe` escrever o nome do mês selecionado no título. */
  protected readonly monthDate = computed(() => {
    const [year, month] = this.selectedMonth().split('-').map(Number);
    return new Date(year, month - 1, 1);
  });
}

import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ClassService } from '../../../service/class.service';
import { Card } from '../../../shared/card/card';
import { PageHeader } from '../../../shared/page-header/page-header';

@Component({
  selector: 'app-ganhos',
  imports: [Card, PageHeader, CurrencyPipe, DatePipe],
  templateUrl: './ganhos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Ganhos {
  private readonly classService = inject(ClassService);

  protected readonly today = new Date();

  protected readonly lessonsInMonth = toSignal(this.classService.getTeacherMonthlyCount(), {
    initialValue: 0,
  });
  protected readonly amountToReceive = toSignal(this.classService.getTeacherMonthlyEarnings(), {
    initialValue: 0,
  });
  protected readonly weeklyCounts = toSignal(this.classService.getTeacherWeeklyCounts(), {
    initialValue: [],
  });

  /** Média por aula no mês — `null` enquanto não houver aula concluída. */
  protected readonly amountPerLesson = computed(() => {
    const lessons = this.lessonsInMonth();
    return lessons ? this.amountToReceive() / lessons : null;
  });

  /** Altura de referência do gráfico: nunca zero, para não dividir por zero. */
  protected readonly busiestWeek = computed(() =>
    Math.max(1, ...this.weeklyCounts().map((week) => week.count ?? 0)),
  );
}

import { ChangeDetectionStrategy, Component, computed, inject, Signal } from '@angular/core';
import { Card } from '../../../shared/card/card';
import { ClassService } from '../../../service/class.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-ganhos',
  imports: [Card],
  templateUrl: './ganhos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Ganhos {
  private readonly classService = inject(ClassService);

  protected readonly lessonsInMonth: Signal<number | undefined> = toSignal(
    this.classService.getTeacherMonthlyClassesCount(),
  );
  protected readonly amountToReceive: Signal<number | undefined> = toSignal(
    this.classService.getTeacherMonthlyEarnings(),
  );
  protected readonly valuePerLesson: Signal<string> = computed(() => {
    const lessons = this.lessonsInMonth();
    const amount = this.amountToReceive();
    return lessons && amount
      ? (amount / lessons).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })
      : '-';
  });

  protected readonly monthlyClassesCountByWeek: Signal<
    { week: number; count: number | null }[] | undefined
  > = toSignal(this.classService.getTeacherMonthlyClassesCountByWeek());

  protected readonly month = new Date().toLocaleDateString('pt-BR', { month: 'long' });

  protected readonly maxWeek: Signal<number> = computed(() => {
    const weeks = this.monthlyClassesCountByWeek() ?? [];
    return Math.max(1, ...weeks.map((w) => w.count ?? 0));
  });
}

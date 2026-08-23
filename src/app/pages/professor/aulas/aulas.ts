import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { toClassView } from '../../../model/view/class-view';
import { ClassService } from '../../../service/class.service';
import { Card } from '../../../shared/card/card';
import { CLASS_STATUS_DISPLAY } from '../../../shared/domain-display';
import { currentMonth } from '../../../shared/month';
import { PageHeader } from '../../../shared/page-header/page-header';

@Component({
  selector: 'app-aulas',
  imports: [Card, PageHeader, DatePipe],
  templateUrl: './aulas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Aulas {
  private readonly classService = inject(ClassService);

  protected readonly classStatus = CLASS_STATUS_DISPLAY;

  /* Mês do histórico, em `YYYY-MM` — o valor do `<input type="month">` é o
   * mesmo formato que a API espera, então vai direto para a requisição. */
  protected readonly selectedMonth = signal(currentMonth());
  protected readonly maxMonth = currentMonth();

  private readonly upcomingClasses = toSignal(this.classService.getTeacherUpcoming(), {
    initialValue: [],
  });
  private readonly recentClasses = rxResource({
    params: () => this.selectedMonth(),
    stream: ({ params }) => this.classService.getTeacherRecent(params),
  });

  protected readonly upcoming = computed(() => this.upcomingClasses().map(toClassView));
  protected readonly history = computed(() =>
    (this.recentClasses.value() ?? []).map(toClassView),
  );
}

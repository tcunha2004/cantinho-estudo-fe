import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { toClassView } from '../../../model/view/class-view';
import { ClassService } from '../../../service/class.service';
import { Card } from '../../../shared/card/card';
import { CLASS_STATUS_DISPLAY } from '../../../shared/domain-display';
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

  private readonly upcomingClasses = toSignal(this.classService.getTeacherUpcoming(), {
    initialValue: [],
  });
  private readonly recentClasses = toSignal(this.classService.getTeacherRecent(), {
    initialValue: [],
  });

  protected readonly upcoming = computed(() => this.upcomingClasses().map(toClassView));
  protected readonly history = computed(() => this.recentClasses().map(toClassView));
}

import { ChangeDetectionStrategy, Component, computed, inject, Signal } from '@angular/core';
import { Card } from '../../../shared/card/card';
import { ClassService } from '../../../service/class.service';
import { ClassStatus } from '../../../model/entity/class.model';
import { toSignal } from '@angular/core/rxjs-interop';

type HistoryStatus = 'Agendada' | 'Realizada' | 'Cancelada' | 'Cancelada (cobrada)';

const STATUS_LABELS: Record<ClassStatus, HistoryStatus> = {
  scheduled: 'Agendada',
  completed: 'Realizada',
  cancelled: 'Cancelada',
  no_show: 'Cancelada (cobrada)',
};

interface UpcomingItem {
  day: string;
  time: string;
  student: string;
  subject: string;
  barColor: string;
}

interface HistoryItem {
  student: string;
  date: string;
  subject: string;
  status: HistoryStatus;
}

@Component({
  selector: 'app-aulas',
  imports: [Card],
  templateUrl: './aulas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Aulas {
  private readonly classService = inject(ClassService);

  protected readonly teacherUpcomingClasses = toSignal(
    this.classService.getTeacherUpcomingClasses(),
  );
  protected readonly teacherRecentClasses = toSignal(this.classService.getTeacherRecentClasses());

  protected readonly upcoming: Signal<UpcomingItem[]> = computed(() => {
    return (this.teacherUpcomingClasses() ?? []).map((classItem) => {
      return {
        day: new Date(classItem.scheduledAt).toLocaleString('pt-br', {
          day: '2-digit',
          month: 'short',
        }),
        time: new Date(classItem.scheduledAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        student: classItem.studentContract.student.user.name,
        subject: classItem.subject.name,
        barColor: `bg-subject-blue`,
      };
    });
  });

  protected readonly history: Signal<HistoryItem[]> = computed(() => {
    return (this.teacherRecentClasses() ?? []).map((classItem) => {
      return {
        student: classItem.studentContract.student.user.name,
        date: new Date(classItem.scheduledAt).toLocaleString('pt-br', {
          day: '2-digit',
          month: '2-digit',
        }),
        subject: classItem.subject.name,
        status: STATUS_LABELS[classItem.status],
      };
    });
  });

  protected readonly statusStyles: Record<HistoryStatus, string> = {
    Agendada: 'bg-accent-soft text-accent',
    Realizada: 'bg-subject-green/15 text-subject-green',
    Cancelada: 'bg-accent-soft text-accent',
    'Cancelada (cobrada)': 'bg-slate-200 text-slate-500',
  };
}

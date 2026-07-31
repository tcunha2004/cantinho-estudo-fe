import { ChangeDetectionStrategy, Component, computed, inject, Signal } from '@angular/core';
import { Card } from '../../../shared/card/card';
import { ClassService } from '../../../service/class.service';
import { toSignal } from '@angular/core/rxjs-interop';

type HistoryStatus = 'Realizada' | 'Cancelada' | 'Cancelada (cobrada)';

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

  protected readonly upcoming: Signal<UpcomingItem[]> = computed(() => {
    return (this.teacherUpcomingClasses() ?? []).map((classItem) => {
      return {
        day: classItem.scheduledAt,
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

  protected readonly history: HistoryItem[] = [
    { student: 'Sofia Martins', date: '16/06', subject: 'Matemática', status: 'Realizada' },
    { student: 'João Pedro', date: '15/06', subject: 'Matemática', status: 'Realizada' },
    {
      student: 'Helena Costa',
      date: '13/06',
      subject: 'Matemática',
      status: 'Cancelada (cobrada)',
    },
    { student: 'Miguel Rocha', date: '12/06', subject: 'Matemática', status: 'Realizada' },
    { student: 'Théo Nunes', date: '10/06', subject: 'Matemática', status: 'Cancelada' },
  ];

  protected readonly statusStyles: Record<HistoryStatus, string> = {
    Realizada: 'bg-subject-green/15 text-subject-green',
    Cancelada: 'bg-slate-200 text-slate-500',
    'Cancelada (cobrada)': 'bg-accent-soft text-accent',
  };
}

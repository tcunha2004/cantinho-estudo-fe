import { ChangeDetectionStrategy, Component, computed, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Card } from '../../../shared/card/card';
import { StudentService } from '../../../service/student.service';
import { ClassService } from '../../../service/class.service';
import { TeacherService } from '../../../service/teacher.service';

interface Stat {
  label: string;
  value: string;
  dotColor: string;
}

interface Lesson {
  time: string;
  student: string;
  subject: string;
  teacher: string;
  barColor: string;
}

interface Plan {
  name: string;
  students: number;
  barColor: string;
}

@Component({
  selector: 'app-painel',
  imports: [Card],
  templateUrl: './painel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Painel {
  private readonly studentService = inject(StudentService);
  private readonly classService = inject(ClassService);
  private readonly teacherService = inject(TeacherService);

  private readonly activeStudentsCount = toSignal(this.studentService.getActiveStudentsCount());
  private readonly currentWeekClassesCount = toSignal(
    this.classService.getCurrentWeekClassesCount(),
  );
  private readonly currentMonthRevenue = toSignal(this.classService.getCurrentMonthRevenue());
  private readonly allTeachersEarningsByMonth = toSignal(
    this.teacherService.getAllTeachersEarningsByMonth(),
  );
  private readonly upcomingClassesToday = toSignal(this.classService.getUpcomingClassesToday());

  protected readonly stats: Signal<Stat[]> = computed(() => [
    {
      label: 'Alunos ativos',
      value: this.activeStudentsCount()?.toString() ?? 'Error',
      dotColor: 'bg-subject-blue',
    },
    {
      label: 'Aulas na semana',
      value: this.currentWeekClassesCount()?.toString() ?? 'Error',
      dotColor: 'bg-subject-green',
    },
    {
      label: 'Receita do mês',
      value:
        this.currentMonthRevenue()?.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }) ?? 'Error',
      dotColor: 'bg-subject-amber',
    },
    {
      label: 'A pagar professores',
      value:
        this.allTeachersEarningsByMonth()?.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }) ?? 'Error',
      dotColor: 'bg-accent',
    },
  ]);

  protected readonly today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

  protected readonly lessons: Signal<Lesson[]> = computed(() => {
    const classes = this.upcomingClassesToday() ?? [];
    return classes.map((cls) => ({
      time: new Date(cls.scheduledAt).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      student: cls.studentContract.student.user.name,
      subject: cls.subject.name,
      teacher: cls.teacher.user.name,
      barColor:
        cls.status === 'scheduled'
          ? 'bg-subject-blue'
          : cls.status === 'completed'
            ? 'bg-subject-green'
            : cls.status === 'cancelled'
              ? 'bg-subject-amber'
              : 'bg-accent',
    }));
  });

  protected readonly plans: Plan[] = [
    { name: 'Ouro', students: 40, barColor: 'bg-subject-amber' },
    { name: 'Prata', students: 26, barColor: 'bg-slate-400' },
    { name: 'Bronze', students: 14, barColor: 'bg-amber-700' },
    { name: 'Avulsa', students: 6, barColor: 'bg-accent' },
  ];

  protected readonly totalStudents = this.plans.reduce((total, plan) => total + plan.students, 0);
}

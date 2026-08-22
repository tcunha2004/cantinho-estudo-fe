import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { PLAN_TYPES } from '../../../model/entity/plan.model';
import { toClassView } from '../../../model/view/class-view';
import { ClassService } from '../../../service/class.service';
import { StudentContractService } from '../../../service/student-contract.service';
import { StudentService } from '../../../service/student.service';
import { TeacherService } from '../../../service/teacher.service';
import { Card } from '../../../shared/card/card';
import { CLASS_STATUS_DISPLAY, PLAN_DISPLAY } from '../../../shared/domain-display';
import { PageHeader } from '../../../shared/page-header/page-header';

@Component({
  selector: 'app-painel',
  imports: [Card, PageHeader, CurrencyPipe, DatePipe],
  templateUrl: './painel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Painel {
  private readonly studentService = inject(StudentService);
  private readonly classService = inject(ClassService);
  private readonly teacherService = inject(TeacherService);
  private readonly contractService = inject(StudentContractService);

  protected readonly today = new Date();
  protected readonly classStatus = CLASS_STATUS_DISPLAY;
  protected readonly planDisplay = PLAN_DISPLAY;

  private readonly activeStudents = toSignal(this.studentService.getActiveCount(), {
    initialValue: 0,
  });
  private readonly monthClasses = toSignal(this.classService.getCurrentMonthCount(), {
    initialValue: 0,
  });
  private readonly activeTeachers = toSignal(this.teacherService.getActiveCount(), {
    initialValue: 0,
  });
  private readonly teachersPayout = toSignal(this.teacherService.getEarningsByMonth());
  private readonly studentsByPlan = toSignal(this.contractService.getActiveCountByPlanType());
  private readonly upcomingToday = toSignal(this.classService.getUpcomingToday(), {
    initialValue: [],
  });

  protected readonly stats = computed(() => [
    {
      label: 'Alunos ativos',
      value: this.activeStudents(),
      dot: 'bg-subject-blue',
      currency: false,
    },
    {
      label: 'Professores ativos',
      value: this.activeTeachers(),
      dot: 'bg-subject-amber',
      currency: false,
    },
    {
      label: 'Aulas no mês',
      value: this.monthClasses(),
      dot: 'bg-subject-green',
      currency: false,
    },
    {
      label: 'A pagar professores',
      value: this.teachersPayout()?.totalAmountToReceive ?? 0,
      dot: 'bg-accent',
      currency: true,
    },
  ]);

  protected readonly lessons = computed(() => this.upcomingToday().map(toClassView));

  /** Alunos ativos por plano, já com a fatia que cada plano ocupa na barra. */
  protected readonly plans = computed(() => {
    const countByType = this.studentsByPlan();
    const rows = PLAN_TYPES.map((type) => ({ type, students: countByType?.[type] ?? 0 }));
    const total = rows.reduce((sum, row) => sum + row.students, 0) || 1;

    return rows.map((row) => ({ ...row, share: (row.students / total) * 100 }));
  });
}

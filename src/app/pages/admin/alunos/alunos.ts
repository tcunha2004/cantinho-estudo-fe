import { ChangeDetectionStrategy, Component, computed, inject, Signal } from '@angular/core';
import { Card } from '../../../shared/card/card';
import { Icon } from '../../../shared/icon/icon';
import { initials } from '../../../shared/initials';
import { StudentService } from '../../../service/student.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActiveStudentDto } from '../../../model/dto/active-student.dto';
import { PlanType } from '../../../model/entity/plan.model';
import { ContractStatus } from '../../../model/entity/student-contract.model';

@Component({
  selector: 'app-alunos',
  imports: [Card, Icon],
  templateUrl: './alunos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Alunos {
  private readonly studentService = inject(StudentService);

  protected readonly activeStudentsCount = toSignal(this.studentService.getActiveStudentsCount());
  protected readonly activeStudents = toSignal(this.studentService.getActiveStudents());

  protected readonly students: Signal<ActiveStudentDto[]> = computed(() => {
    return this.activeStudents() ?? [];
  });

  protected readonly planStyles: Record<PlanType, string> = {
    ouro: 'bg-subject-amber/15 text-subject-amber',
    prata: 'bg-slate-400/20 text-slate-500',
    bronze: 'bg-amber-700/15 text-amber-700',
    avulsa: 'bg-accent-soft text-accent',
  };

  protected readonly statusStyles: Record<ContractStatus, string> = {
    active: 'bg-subject-green/15 text-subject-green',
    cancelled: 'bg-subject-amber/15 text-subject-amber',
    expired: 'bg-accent-soft text-accent',
  };

  protected readonly statusLabels: Record<ContractStatus, string> = {
    active: 'Ativo',
    cancelled: 'Cancelado',
    expired: 'Vencido',
  };

  protected readonly initials = initials;
}

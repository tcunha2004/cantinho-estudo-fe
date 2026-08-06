import { ChangeDetectionStrategy, Component, computed, inject, Signal } from '@angular/core';
import { Card } from '../../../shared/card/card';
import { Icon } from '../../../shared/icon/icon';
import { StudentService } from '../../../service/student.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { PlanType } from '../../../model/entity/plan.model';
import { ContractStatus } from '../../../model/entity/student-contract.model';

@Component({
  selector: 'app-plano',
  imports: [Card, Icon],
  templateUrl: './plano.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Plano {
  private readonly studentService = inject(StudentService);

  protected readonly studentPlan = toSignal(this.studentService.getStudentPlan());

  protected readonly planName = computed(() => {
    return this.planNames[this.studentPlan()!.planType] ?? '-';
  });

  protected readonly frequency = computed(() => {
    return this.studentPlan()?.frequency ?? '-';
  });
  
  protected readonly monthlyPrice = computed(() => {
    return (
      Number(this.studentPlan()?.monthlyPrice).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }) ?? '-'
    );
  });

  protected readonly contractStatus = computed(() => {
    return this.planStatus[this.studentPlan()!.contractStatus] ?? '-';
  });

  protected readonly lessonsTotal = computed(() => {
    return this.studentPlan()?.classesCount ?? '-';
  });

  protected readonly month = new Date().toLocaleString('pt-BR', { month: 'long' });

  protected readonly includes: Signal<string[]> = computed(() => {
    return this.planName() !== 'Avulso'
      ? [
          `${this.lessonsTotal()} aulas individuais por mês`,
          'Professor fixo por matéria',
          'Agenda online com remarcação',
        ]
      : ['Aulas individuais', 'Professor fixo por matéria', 'Agenda online com remarcação'];
  });

  protected readonly cancellationRule =
    'avise com 24h de antecedência. Aulas desmarcadas em cima da hora são cobradas normalmente.';

  protected readonly otherPlans = toSignal(this.studentService.getOtherPlans());

  protected readonly planNames: Record<PlanType, string> = {
    ouro: 'Ouro',
    prata: 'Prata',
    bronze: 'Bronze',
    avulsa: 'Avulso',
  };

  protected readonly planStatus: Record<ContractStatus, string> = {
    active: 'Ativo',
    cancelled: 'Cancelado',
    expired: 'Expirado',
  };

  protected readonly planColors: Record<PlanType, string> = {
    ouro: 'bg-amber-400',
    prata: 'bg-slate-400',
    bronze: 'bg-amber-700',
    avulsa: 'bg-accent',
  };
}

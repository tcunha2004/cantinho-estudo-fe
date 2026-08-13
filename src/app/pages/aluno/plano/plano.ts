import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { PLAN_TYPES } from '../../../model/entity/plan.model';
import { StudentService } from '../../../service/student.service';
import { Card } from '../../../shared/card/card';
import { CONTRACT_STATUS_DISPLAY, PLAN_DISPLAY } from '../../../shared/domain-display';
import { Icon } from '../../../shared/icon/icon';
import { PageHeader } from '../../../shared/page-header/page-header';

/** Vale para qualquer plano; a contagem de aulas entra só quando o plano tem pacote. */
const BASE_BENEFITS = ['Professor fixo por matéria', 'Agenda online com remarcação'];

@Component({
  selector: 'app-plano',
  imports: [Card, Icon, PageHeader, CurrencyPipe],
  templateUrl: './plano.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Plano {
  private readonly studentService = inject(StudentService);

  protected readonly planDisplay = PLAN_DISPLAY;
  protected readonly contractStatus = CONTRACT_STATUS_DISPLAY;

  protected readonly plan = toSignal(this.studentService.getMyPlan());

  /** Os demais planos que o aluno pode contratar: a lista fixa menos o atual. */
  protected readonly otherPlans = computed(() => {
    const current = this.plan()?.planType;
    return current ? PLAN_TYPES.filter((type) => type !== current) : [];
  });

  protected readonly benefits = computed(() => {
    const classesCount = this.plan()?.classesCount;
    const lessons = classesCount
      ? `${classesCount} aulas individuais por mês`
      : 'Aulas individuais';

    return [lessons, ...BASE_BENEFITS];
  });

  /**
   * Hora/aula por local: sempre a do Cantinho do Estudo, e a da região do
   * aluno quando ela for diferente — não há mensalidade fixa, o valor de cada
   * aula depende de onde ela acontece.
   */
  protected readonly pricingRows = computed(() => {
    const plan = this.plan();

    if (!plan) {
      return [];
    }

    const cantinho = { label: 'No Cantinho do Estudo', hourPrice: plan.cantinhoHourPrice };

    if (plan.hourPrice === plan.cantinhoHourPrice) {
      return [cantinho];
    }

    return [cantinho, { label: `Na sua região (${plan.region})`, hourPrice: plan.hourPrice }];
  });

  protected readonly cancellationRule =
    'avise com 24h de antecedência. Aulas desmarcadas em cima da hora são cobradas normalmente.';
}

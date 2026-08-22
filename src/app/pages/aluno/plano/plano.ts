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

  /** Pacote (Bronze) conta as aulas na validade toda; os mensais, por mês. */
  protected readonly benefits = computed(() => {
    const plan = this.plan();
    const count = plan?.classesCount;

    if (!plan || !count) {
      return ['Aulas individuais', ...BASE_BENEFITS];
    }

    const lessons = plan.validityMonths
      ? `${count} aulas individuais, para usar em até ${plan.validityMonths} meses`
      : `${count} aulas individuais por mês`;

    return [lessons, ...BASE_BENEFITS];
  });

  /**
   * O que o aluno paga. A avulsa é a única modalidade cobrada por aula; o
   * Bronze é um pacote pago de uma vez; os demais, mensalidade fixa —
   * independente de quantas aulas ele faz e de onde as faz.
   */
  protected readonly price = computed(() => {
    const plan = this.plan();

    if (!plan) {
      return null;
    }

    if (plan.planType === 'avulsa') {
      return { value: plan.hourPrice, unit: '/ hora-aula' };
    }

    return {
      value: plan.monthlyPrice,
      unit: plan.validityMonths ? '· pacote' : '/ mês',
    };
  });

  /** Só o Bronze e a avulsa fogem da mensalidade — cada um com a sua nota. */
  protected readonly priceNote = computed(() => {
    const plan = this.plan();

    if (plan?.planType === 'avulsa') {
      return 'Você paga por aula, sem mensalidade.';
    }

    if (plan?.validityMonths) {
      return `Pacote pago de uma vez, válido por ${plan.validityMonths} meses.`;
    }

    return 'Valor fixo por mês, independente de quantas aulas você faz e de onde elas acontecem.';
  });

  protected readonly cancellationRule =
    'avise com 24h de antecedência. Aulas desmarcadas em cima da hora são cobradas normalmente.';
}

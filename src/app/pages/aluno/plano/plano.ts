import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { AgendaClassDto } from '../../../model/dto/agenda-class.dto';
import { StudentPlanDto } from '../../../model/dto/student-plan.dto';
import { ClassService } from '../../../service/class.service';
import { StudentService } from '../../../service/student.service';
import { Card } from '../../../shared/card/card';
import { CONTRACT_STATUS_DISPLAY, PLAN_DISPLAY } from '../../../shared/domain-display';
import { Icon } from '../../../shared/icon/icon';
import { monthRange } from '../../../shared/month';
import { PageHeader } from '../../../shared/page-header/page-header';

/**
 * Vale para qualquer plano; a contagem de aulas entra só quando o plano tem
 * pacote. O professor é definido em cada aula (classes.teacher_id) — não existe
 * professor amarrado ao contrato, então a lista não promete um professor fixo.
 */
const BASE_BENEFITS = [
  'Professor por matéria, definido em cada aula',
  'Aula no Cantinho ou na casa do aluno',
  'Agenda online: agendar e remarcar pela plataforma',
];

/** Linha do bloco de detalhes do contrato. Valor nulo não vira linha. */
interface Detail {
  label: string;
  value: string | null;
}

/*
 * O que o aluno já consumiu do plano. Aula realizada e falta sem aviso contam
 * igual — as duas são cobradas (BILLABLE_STATUSES no backend). Aula cancelada
 * com aviso não conta, e a agendada ainda não consumiu nada: entra só como
 * previsão do que falta acontecer.
 *
 * `total` é nulo na avulsa, que não tem pacote de aulas a consumir — ali só as
 * contagens fazem sentido.
 */
export function summarizeUsage(classes: AgendaClassDto[], total: number | null) {
  const count = (status: AgendaClassDto['status']) =>
    classes.filter((item) => item.status === status).length;

  const completed = count('completed');
  const noShow = count('no_show');
  const scheduled = count('scheduled');
  const used = completed + noShow;

  return {
    completed,
    noShow,
    scheduled,
    used,
    total,
    remaining: total === null ? null : Math.max(0, total - used),
    /* A barra para em 100%: passar do plano não vira barra estourada. */
    percent: total ? Math.min(100, Math.round((used / total) * 100)) : 0,
  };
}

/*
 * Janela do consumo: o pacote (Bronze) é consumido na validade inteira do
 * contrato, então conta do início ao fim dele; os demais renovam todo mês.
 */
function usageRange(plan: StudentPlanDto): { from: string; to: string } {
  return plan.validityMonths && plan.endDate
    ? { from: plan.startDate, to: plan.endDate }
    : monthRange();
}

@Component({
  selector: 'app-plano',
  imports: [Card, Icon, PageHeader, CurrencyPipe],
  /* O pipe também é usado em código, pra formatar a hora-aula na lista de
   * detalhes com o mesmo locale/moeda do template. */
  providers: [CurrencyPipe],
  templateUrl: './plano.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Plano {
  private readonly studentService = inject(StudentService);
  private readonly classService = inject(ClassService);
  private readonly currency = inject(CurrencyPipe);

  protected readonly planDisplay = PLAN_DISPLAY;
  protected readonly contractStatus = CONTRACT_STATUS_DISPLAY;

  protected readonly plan = toSignal(this.studentService.getMyPlan());

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

  /**
   * Dados do contrato que a API já devolve: a região explica o preço (a tabela
   * varia por região), o desconto explica a diferença entre o preço de tabela e
   * o que o aluno paga, e a vigência só tem fim no pacote (Bronze).
   */
  protected readonly details = computed<Detail[]>(() => {
    const plan = this.plan();

    if (!plan) {
      return [];
    }

    const discount = Number(plan.discountPercentage ?? 0);

    return [
      { label: 'Região de atendimento', value: plan.region },
      {
        /* Nos planos mensais é referência: o aluno paga a mensalidade cheia. */
        label: plan.planType === 'avulsa' ? 'Valor da hora-aula' : 'Hora-aula de referência',
        value: this.currency.transform(plan.hourPrice),
      },
      {
        label: 'Desconto aplicado',
        value: discount ? `${discount}% já embutido no valor acima` : null,
      },
      { label: 'Início do contrato', value: this.date(plan.startDate) },
      { label: 'Vigência até', value: this.date(plan.endDate) },
    ].filter((detail) => detail.value !== null);
  });

  /* Aulas da janela de consumo. Espera o plano: é ele que define o intervalo. */
  private readonly classes = rxResource({
    params: () => {
      const plan = this.plan();
      return plan ? usageRange(plan) : undefined;
    },
    stream: ({ params }) => this.classService.getAgenda(params),
  });

  /** Quanto do plano já foi usado. Nulo enquanto plano ou aulas não chegam. */
  protected readonly usage = computed(() => {
    const plan = this.plan();
    const classes = this.classes.value();

    if (!plan || !classes) {
      return null;
    }

    /* A avulsa é cobrada por aula: não há pacote contratado a consumir. */
    const total = plan.planType === 'avulsa' ? null : plan.classesCount;

    return summarizeUsage(classes, total);
  });

  /** O pacote é consumido na validade toda; os demais, mês a mês. */
  protected readonly usageTitle = computed(() =>
    this.plan()?.validityMonths ? 'Consumo do pacote' : 'Aulas deste mês',
  );

  protected readonly cancellationRule =
    'avise com 24h de antecedência. Aula desmarcada em cima da hora, ou falta sem aviso, entra como aula cobrada.';

  /** `YYYY-MM-DD` ingênuo em dd/mm/aaaa, sem passar por Date (nada de fuso). */
  private date(value: string | null): string | null {
    return value ? value.slice(0, 10).split('-').reverse().join('/') : null;
  }
}

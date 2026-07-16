import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Card } from '../../../shared/card/card';
import { Icon } from '../../../shared/icon/icon';

interface OtherPlan {
  name: string;
  detail: string;
  price: string;
  barColor: string;
}

@Component({
  selector: 'app-plano',
  imports: [Card, Icon],
  templateUrl: './plano.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Plano {
  // Dados mockados até a integração com o backend.
  protected readonly planName = 'Plano Ouro';
  protected readonly frequency = '3x na semana';
  protected readonly monthlyPrice = 'R$ 1.860';
  protected readonly enrollmentNote = 'Matrícula paga · próximo vencimento 10/07';

  protected readonly lessonsUsed = 9;
  protected readonly lessonsTotal = 12;
  protected readonly usageMonth = 'junho';

  protected readonly includes: string[] = [
    '12 aulas individuais por mês',
    'Professor fixo por matéria',
    'Agenda online com remarcação',
    'Relatório de acompanhamento mensal',
  ];

  protected readonly cancellationRule =
    'avise com 24h de antecedência. Aulas desmarcadas em cima da hora são cobradas normalmente.';

  protected readonly otherPlans: OtherPlan[] = [
    { name: 'Plano Prata', detail: '10 aulas mensais', price: 'R$ 1.800', barColor: 'bg-slate-400' },
    { name: 'Plano Bronze', detail: 'Pacote 10 aulas', price: 'R$ 2.000', barColor: 'bg-amber-700' },
    { name: 'Aula avulsa', detail: 'Sem fidelidade', price: 'R$ 220', barColor: 'bg-accent' },
  ];

  protected get lessonsRemaining(): number {
    return this.lessonsTotal - this.lessonsUsed;
  }

  protected get usagePercent(): number {
    return (this.lessonsUsed / this.lessonsTotal) * 100;
  }
}

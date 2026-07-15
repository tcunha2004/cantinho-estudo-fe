import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Card } from '../../../shared/card/card';

interface Stat {
  label: string;
  value: string;
  valueColor: string;
  note: string;
}

interface OuroRow {
  frequency: string;
  monthly: string;
  perLesson: string;
}

@Component({
  selector: 'app-financeiro',
  imports: [Card],
  templateUrl: './financeiro.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Financeiro {
  // Dados mockados até a integração com o backend.
  protected readonly stats: Stat[] = [
    {
      label: 'Receita do mês',
      value: 'R$ 64.200',
      valueColor: 'text-subject-green',
      note: '+8% vs. maio',
    },
    {
      label: 'Em aberto',
      value: 'R$ 4.980',
      valueColor: 'text-subject-amber',
      note: '3 mensalidades',
    },
    {
      label: 'Matrículas 2026',
      value: 'R$ 13.200',
      valueColor: 'text-subject-blue',
      note: '66 contratos',
    },
  ];

  protected readonly ouroRows: OuroRow[] = [
    { frequency: '2x na semana', monthly: 'R$ 1.320', perLesson: 'R$ 165' },
    { frequency: '3x na semana', monthly: 'R$ 1.860', perLesson: 'R$ 155' },
    { frequency: '5x na semana', monthly: 'R$ 2.900', perLesson: 'R$ 145' },
  ];

  protected readonly ouroNote = 'Matrícula R$ 200,00 · pagamento integral de fevereiro a dezembro';
}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Card } from '../../../shared/card/card';

type PaymentStatus = 'Pago' | 'Em aberto';

interface Payment {
  abbr: string;
  label: string;
  method: string;
  amount: string;
  status: PaymentStatus;
}

@Component({
  selector: 'app-pagamentos',
  imports: [Card],
  templateUrl: './pagamentos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pagamentos {
  // Dados mockados até a integração com o backend.
  protected readonly nextAmount = 'R$ 1.860,00';
  protected readonly nextDueDate = '10/07';

  protected readonly payments: Payment[] = [
    { abbr: 'JUL', label: 'Julho', method: 'Pix · aguardando', amount: 'R$ 1.860,00', status: 'Em aberto' },
    { abbr: 'JUN', label: 'Junho', method: 'Cartão de crédito', amount: 'R$ 1.860,00', status: 'Pago' },
    { abbr: 'MAI', label: 'Maio', method: 'Pix', amount: 'R$ 1.860,00', status: 'Pago' },
    { abbr: 'ABR', label: 'Abril', method: 'Pix', amount: 'R$ 1.860,00', status: 'Pago' },
    { abbr: 'MAT', label: 'Matrícula 2026', method: 'Cartão de crédito', amount: 'R$ 200,00', status: 'Pago' },
  ];

  protected readonly statusStyles: Record<PaymentStatus, string> = {
    Pago: 'bg-subject-green/15 text-subject-green',
    'Em aberto': 'bg-subject-amber/15 text-subject-amber',
  };
}

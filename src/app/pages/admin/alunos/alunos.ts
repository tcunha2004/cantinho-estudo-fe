import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Card } from '../../../shared/card/card';
import { Icon } from '../../../shared/icon/icon';
import { initials } from '../../../shared/initials';

type PlanName = 'Ouro' | 'Prata' | 'Bronze' | 'Avulsa';
type PaymentStatus = 'Em dia' | 'Pendente' | 'Atrasado';

interface Student {
  name: string;
  guardian: string;
  plan: PlanName;
  frequency: string;
  fee: string;
  status: PaymentStatus;
}

@Component({
  selector: 'app-alunos',
  imports: [Card, Icon],
  templateUrl: './alunos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Alunos {
  // Dados mockados até a integração com o backend.
  protected readonly activeCount = 86;

  protected readonly students: Student[] = [
    { name: 'Sofia Martins', guardian: 'Camila Martins', plan: 'Ouro', frequency: '3x/semana', fee: 'R$ 1.860,00', status: 'Em dia' },
    { name: 'João Pedro Alves', guardian: 'Renato Alves', plan: 'Prata', frequency: '10 aulas/mês', fee: 'R$ 1.800,00', status: 'Em dia' },
    { name: 'Helena Costa', guardian: 'Bianca Costa', plan: 'Ouro', frequency: '2x/semana', fee: 'R$ 1.320,00', status: 'Pendente' },
    { name: 'Miguel Rocha', guardian: 'Paula Rocha', plan: 'Bronze', frequency: 'Pacote 10', fee: 'R$ 2.000,00', status: 'Em dia' },
    { name: 'Laura Dias', guardian: 'Sérgio Dias', plan: 'Avulsa', frequency: '—', fee: 'R$ 220,00', status: 'Em dia' },
    { name: 'Théo Nunes', guardian: 'Aline Nunes', plan: 'Prata', frequency: '10 aulas/mês', fee: 'R$ 1.800,00', status: 'Atrasado' },
  ];

  protected readonly planStyles: Record<PlanName, string> = {
    Ouro: 'bg-subject-amber/15 text-subject-amber',
    Prata: 'bg-slate-400/20 text-slate-500',
    Bronze: 'bg-amber-700/15 text-amber-700',
    Avulsa: 'bg-accent-soft text-accent',
  };

  protected readonly statusStyles: Record<PaymentStatus, string> = {
    'Em dia': 'bg-subject-green/15 text-subject-green',
    Pendente: 'bg-subject-amber/15 text-subject-amber',
    Atrasado: 'bg-accent-soft text-accent',
  };

  protected readonly initials = initials;
}

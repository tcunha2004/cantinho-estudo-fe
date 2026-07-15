import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Card } from '../../../shared/card/card';

type HistoryStatus = 'Realizada' | 'Cancelada' | 'Cancelada (cobrada)';

interface UpcomingItem {
  day: string;
  time: string;
  student: string;
  subject: string;
  barColor: string;
}

interface HistoryItem {
  student: string;
  date: string;
  subject: string;
  status: HistoryStatus;
}

@Component({
  selector: 'app-aulas',
  imports: [Card],
  templateUrl: './aulas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Aulas {
  // Mock até integração com backend
  protected readonly upcoming: UpcomingItem[] = [
    {
      day: 'Qua',
      time: '08:30',
      student: 'Sofia Martins',
      subject: 'Matemática',
      barColor: 'bg-subject-blue',
    },
    {
      day: 'Qua',
      time: '15:00',
      student: 'Théo Nunes',
      subject: 'Matemática',
      barColor: 'bg-subject-blue',
    },
    {
      day: 'Qui',
      time: '14:00',
      student: 'Théo Nunes',
      subject: 'Matemática',
      barColor: 'bg-subject-blue',
    },
    {
      day: 'Sex',
      time: '16:00',
      student: 'Miguel Rocha',
      subject: 'Matemática',
      barColor: 'bg-subject-blue',
    },
  ];

  protected readonly history: HistoryItem[] = [
    { student: 'Sofia Martins', date: '16/06', subject: 'Matemática', status: 'Realizada' },
    { student: 'João Pedro', date: '15/06', subject: 'Matemática', status: 'Realizada' },
    {
      student: 'Helena Costa',
      date: '13/06',
      subject: 'Matemática',
      status: 'Cancelada (cobrada)',
    },
    { student: 'Miguel Rocha', date: '12/06', subject: 'Matemática', status: 'Realizada' },
    { student: 'Théo Nunes', date: '10/06', subject: 'Matemática', status: 'Cancelada' },
  ];

  protected readonly statusStyles: Record<HistoryStatus, string> = {
    Realizada: 'bg-subject-green/15 text-subject-green',
    Cancelada: 'bg-slate-200 text-slate-500',
    'Cancelada (cobrada)': 'bg-accent-soft text-accent',
  };
}

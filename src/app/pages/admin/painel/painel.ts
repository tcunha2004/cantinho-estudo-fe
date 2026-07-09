import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Card } from '../../../shared/card/card';

interface Stat {
  label: string;
  value: string;
  note: string;
  dotColor: string;
}

interface Lesson {
  time: string;
  student: string;
  subject: string;
  teacher: string;
  barColor: string;
}

interface Plan {
  name: string;
  students: number;
  barColor: string;
}

@Component({
  selector: 'app-painel',
  imports: [Card],
  templateUrl: './painel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Painel {
  // Dados mockados até a integração com o backend.
  protected readonly stats: Stat[] = [
    { label: 'Alunos ativos', value: '86', note: '+4 este mês', dotColor: 'bg-subject-blue' },
    { label: 'Aulas na semana', value: '12', note: '9 horários livres', dotColor: 'bg-subject-green' },
    { label: 'Receita do mês', value: 'R$ 64,2 mil', note: '+8% vs. maio', dotColor: 'bg-subject-amber' },
    { label: 'A pagar professores', value: 'R$ 9,6 mil', note: 'Fecha em 05/07', dotColor: 'bg-accent' },
  ];

  protected readonly today = 'Quarta-feira, 17 de junho';

  protected readonly lessons: Lesson[] = [
    { time: '14:00', student: 'Théo Nunes', subject: 'Matemática', teacher: 'Renata Lima', barColor: 'bg-subject-blue' },
    { time: '15:00', student: 'Sofia Martins', subject: 'Português', teacher: 'Carlos Mendes', barColor: 'bg-accent' },
    { time: '16:00', student: 'Miguel Rocha', subject: 'Matemática', teacher: 'Renata Lima', barColor: 'bg-subject-blue' },
    { time: '17:00', student: 'Laura Dias', subject: 'Inglês', teacher: 'Juliana Reis', barColor: 'bg-subject-green' },
  ];

  protected readonly plans: Plan[] = [
    { name: 'Ouro', students: 40, barColor: 'bg-subject-amber' },
    { name: 'Prata', students: 26, barColor: 'bg-slate-400' },
    { name: 'Bronze', students: 14, barColor: 'bg-amber-700' },
    { name: 'Avulsa', students: 6, barColor: 'bg-accent' },
  ];

  protected readonly totalStudents = this.plans.reduce(
    (total, plan) => total + plan.students,
    0,
  );
}

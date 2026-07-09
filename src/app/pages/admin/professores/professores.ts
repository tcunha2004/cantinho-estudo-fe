import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Card } from '../../../shared/card/card';
import { initials } from '../../../shared/initials';

interface Teacher {
  name: string;
  subject: string;
  avatarColor: string;
  lessonsInMonth: number;
  pricePerLesson: string;
  amountDue: string;
}

@Component({
  selector: 'app-professores',
  imports: [Card],
  templateUrl: './professores.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Professores {
  // Dados mockados até a integração com o backend.
  protected readonly month = 'junho';
  protected readonly totalDue = 'R$ 9.600,00';

  protected readonly teachers: Teacher[] = [
    { name: 'Renata Lima', subject: 'Matemática', avatarColor: 'bg-subject-blue', lessonsInMonth: 42, pricePerLesson: 'R$ 70,00', amountDue: 'R$ 2.940,00' },
    { name: 'Carlos Mendes', subject: 'Português', avatarColor: 'bg-accent', lessonsInMonth: 38, pricePerLesson: 'R$ 70,00', amountDue: 'R$ 2.660,00' },
    { name: 'Juliana Reis', subject: 'Inglês', avatarColor: 'bg-subject-green', lessonsInMonth: 30, pricePerLesson: 'R$ 75,00', amountDue: 'R$ 2.250,00' },
    { name: 'André Souza', subject: 'Ciências', avatarColor: 'bg-subject-purple', lessonsInMonth: 25, pricePerLesson: 'R$ 70,00', amountDue: 'R$ 1.750,00' },
  ];

  protected readonly initials = initials;
}

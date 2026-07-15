import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Card } from '../../../shared/card/card';

interface Week {
  label: string;
  count: number;
}

@Component({
  selector: 'app-ganhos',
  imports: [Card],
  templateUrl: './ganhos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Ganhos {
  // Mock até integração com backend
  protected readonly month = 'junho';
  protected readonly lessonsInMonth = 42;
  protected readonly canceledCount = 2;
  protected readonly valuePerLesson = 'R$ 70';
  protected readonly amountDue = 'R$ 2.940';
  protected readonly payoutDate = '05/07';

  protected readonly weeks: Week[] = [
    { label: 'Sem 1', count: 9 },
    { label: 'Sem 2', count: 12 },
    { label: 'Sem 3', count: 11 },
    { label: 'Sem 4', count: 10 },
  ];

  protected readonly maxWeek = Math.max(...this.weeks.map((w) => w.count));
}

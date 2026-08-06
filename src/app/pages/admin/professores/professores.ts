import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TeacherService } from '../../../service/teacher.service';
import { Card } from '../../../shared/card/card';
import { initials } from '../../../shared/initials';
import { PageHeader } from '../../../shared/page-header/page-header';

const AVATAR_COLORS = [
  'bg-subject-blue',
  'bg-subject-green',
  'bg-subject-purple',
  'bg-subject-amber',
  'bg-accent',
];

@Component({
  selector: 'app-professores',
  imports: [Card, PageHeader, CurrencyPipe, DatePipe],
  templateUrl: './professores.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Professores {
  private readonly teacherService = inject(TeacherService);

  protected readonly initials = initials;
  protected readonly today = new Date();

  private readonly earnings = toSignal(this.teacherService.getEarningsByMonth());

  protected readonly teachers = computed(() => this.earnings()?.teachers ?? []);
  protected readonly totalDue = computed(() => this.earnings()?.totalAmountToReceive ?? 0);

  /*
   * Escolhe uma cor da paleta a partir do id do professor: cada professor tem
   * uma cor própria que não muda entre renderizações.
   */
  protected avatarColor(teacherId: string): string {
    const hash = [...teacherId].reduce((total, char) => total + char.charCodeAt(0), 0);
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
  }
}

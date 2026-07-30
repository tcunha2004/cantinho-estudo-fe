import { ChangeDetectionStrategy, Component, computed, inject, Signal } from '@angular/core';
import { Card } from '../../../shared/card/card';
import { initials } from '../../../shared/initials';
import { TeacherService } from '../../../service/teacher.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { TeacherEarningsDto } from '../../../model/dto/teacher-earnings.dto';

const AVATAR_COLORS = [
  'bg-subject-blue',
  'bg-subject-green',
  'bg-subject-purple',
  'bg-subject-amber',
  'bg-accent',
];

@Component({
  selector: 'app-professores',
  imports: [Card],
  templateUrl: './professores.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Professores {
  private readonly teacherService = inject(TeacherService);

  protected readonly teachersEarnings = toSignal(
    this.teacherService.getAllTeachersEarningsByMonth(),
  );

  protected readonly month = new Date().toLocaleDateString('pt-BR', { month: 'long' });
  protected readonly totalDue = computed(
    () =>
      this.teachersEarnings()?.totalAmountToReceive.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }) ?? 'Error',
  );

  protected readonly teachers: Signal<TeacherEarningsDto[]> = computed(
    () => this.teachersEarnings()?.teachers ?? [],
  );

  protected readonly initials = initials;

  /*
   * Sorteia uma cor da paleta a partir do id do professor: cada professor tem
   * uma cor própria que não muda entre renderizações.
   */
  protected avatarColor(teacherId: string): string {
    const hash = [...teacherId].reduce((total, char) => total + char.charCodeAt(0), 0);
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
  }
}

import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { SignupLinkService } from '../../../service/signup-link.service';
import { TeacherService } from '../../../service/teacher.service';
import { SignupLinkModal } from '../signup-link-modal';
import { CommissionInfoModal } from './commission-info-modal';
import { TeacherDetailModal } from './teacher-detail-modal';
import { Card } from '../../../shared/card/card';
import { Icon } from '../../../shared/icon/icon';
import { initials } from '../../../shared/initials';
import { currentMonth } from '../../../shared/month';
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
  imports: [
    Card,
    PageHeader,
    CurrencyPipe,
    DatePipe,
    Icon,
    CommissionInfoModal,
    SignupLinkModal,
    TeacherDetailModal,
  ],
  templateUrl: './professores.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Professores {
  private readonly teacherService = inject(TeacherService);
  private readonly signupLinkService = inject(SignupLinkService);

  protected readonly initials = initials;

  /* Mês de referência dos ganhos, em `YYYY-MM` — o formato do `<input type="month">`
   * é o mesmo que a API espera, então vai direto para a requisição. */
  protected readonly selectedMonth = signal(currentMonth());
  protected readonly maxMonth = currentMonth();

  /* Padrão "ativos": a folha do dia a dia é dos ativos, os inativos são consulta. */
  protected readonly statusFilter = signal<'active' | 'inactive' | 'all'>('active');

  protected readonly selectedTeacherId = signal<string | null>(null);
  protected readonly showCommissionInfo = signal(false);
  protected readonly creatingLink = signal(false);

  /* `approvals` entra na chave para o professor recém-aprovado no sino aparecer
   * aqui sem depender de o admin recarregar a página — mesmo motivo de `alunos`. */
  private readonly earnings = rxResource({
    params: () => ({
      month: this.selectedMonth(),
      approvals: this.signupLinkService.approvals(),
    }),
    stream: ({ params }) => this.teacherService.getEarningsByMonth(params.month),
  });

  private readonly teachers = computed(() => this.earnings.value()?.teachers ?? []);

  /* O total acima é a folha inteira do mês e não acompanha este filtro:
   * professor inativado no meio do mês ainda recebe pelas aulas que deu. */
  protected readonly visibleTeachers = computed(() => {
    const status = this.statusFilter();

    return status === 'all'
      ? this.teachers()
      : this.teachers().filter((teacher) => teacher.active === (status === 'active'));
  });

  protected readonly totalDue = computed(() => this.earnings.value()?.totalAmountToReceive ?? 0);

  /* Só para o `DatePipe` escrever o nome do mês selecionado no título. */
  protected readonly monthDate = computed(() => {
    const [year, month] = this.selectedMonth().split('-').map(Number);
    return new Date(year, month - 1, 1);
  });

  protected reloadTeachers(): void {
    this.earnings.reload();
  }

  /*
   * Escolhe uma cor da paleta a partir do id do professor: cada professor tem
   * uma cor própria que não muda entre renderizações.
   */
  protected avatarColor(teacherId: string): string {
    const hash = [...teacherId].reduce((total, char) => total + char.charCodeAt(0), 0);
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
  }
}

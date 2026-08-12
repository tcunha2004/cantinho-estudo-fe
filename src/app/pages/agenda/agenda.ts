import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { AgendaClassDto, ClassDetailDto } from '../../model/dto/agenda-class.dto';
import { ClassFormOptionsDto } from '../../model/dto/class-form-options.dto';
import { ClassService } from '../../service/class.service';
import { Session } from '../../core/session';
import { Icon } from '../../shared/icon/icon';
import { Modal } from '../../shared/modal/modal';
import { PageHeader } from '../../shared/page-header/page-header';
import { CalendarGrid } from './calendar-grid';
import { ClassDetailsModal } from './class-details-modal';
import { ClassFormModal } from './class-form-modal';
import { buildDays, dayOf, startOfDay, ViewMode, visibleRange } from './agenda-layout';

const EMPTY_OPTIONS: ClassFormOptionsDto = { teachers: [], subjects: [], students: [] };

const SUBTITLE_BY_ROLE = {
  admin: 'Todas as aulas do Cantinho',
  professor: 'Suas aulas e horários',
  student: 'Suas aulas e horários',
};

/*
 * Qual janela está aberta. Modelar como um único sinal evita meia dúzia de
 * booleanos que podem se contradizer.
 */
type ModalState =
  | { kind: 'create' }
  | { kind: 'blocked' }
  | { kind: 'details'; id: string }
  | { kind: 'edit'; item: ClassDetailDto }
  | null;

/**
 * Agenda: mesma tela para os três papéis, com o que cada um pode fazer decidido
 * pelo papel do token. O backend também escopa e valida — o que muda aqui é só
 * o que faz sentido oferecer, nunca a fronteira de segurança.
 */
@Component({
  selector: 'app-agenda',
  imports: [DatePipe, CalendarGrid, ClassDetailsModal, ClassFormModal, Icon, Modal, PageHeader],
  templateUrl: './agenda.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Agenda {
  private readonly classService = inject(ClassService);

  protected readonly role = inject(Session).role;
  protected readonly canSchedule = computed(() => {
    const role = this.role();
    return role === 'admin' || role === 'professor';
  });
  protected readonly subtitle = computed(() => {
    const role = this.role();
    return role ? SUBTITLE_BY_ROLE[role] : '';
  });

  protected readonly viewMode = signal<ViewMode>('week');
  protected readonly anchorDate = signal(startOfDay(new Date()));
  protected readonly teacherFilter = signal('');
  protected readonly studentFilter = signal('');

  protected readonly modal = signal<ModalState>(null);
  protected readonly feedback = signal<string | null>(null);

  protected readonly range = computed(() => visibleRange(this.anchorDate(), this.viewMode()));

  private readonly classes = rxResource({
    params: () => {
      const { from, to } = this.range();
      const teacherId = this.teacherFilter();
      const studentId = this.studentFilter();

      return {
        from,
        to,
        ...(teacherId ? { teacherId } : {}),
        ...(studentId ? { studentId } : {}),
      };
    },
    stream: ({ params }) => this.classService.getAgenda(params),
    defaultValue: [] as AgendaClassDto[],
  });

  /* Alunos não agendam, então nem chegam a pedir as opções do formulário. */
  private readonly options = rxResource({
    params: () => (this.canSchedule() ? this.role() : undefined),
    stream: () => this.classService.getFormOptions(),
    defaultValue: EMPTY_OPTIONS,
  });

  protected readonly formOptions = this.options.value;
  protected readonly loading = this.classes.isLoading;
  protected readonly loadError = this.classes.error;

  protected readonly days = computed(() => buildDays(this.range().days, this.classes.value()));

  protected shift(direction: -1 | 1): void {
    const step = this.viewMode() === 'day' ? 1 : 7;
    this.feedback.set(null);
    this.anchorDate.update((date) => {
      const moved = new Date(date);
      moved.setDate(moved.getDate() + direction * step);
      return moved;
    });
  }

  protected goToday(): void {
    this.feedback.set(null);
    this.anchorDate.set(startOfDay(new Date()));
  }

  protected setViewMode(mode: ViewMode): void {
    this.feedback.set(null);
    this.viewMode.set(mode);
  }

  /* Aluno também tem o botão, mas o que ele recebe é a explicação de por que
   * não pode agendar. */
  protected openNew(): void {
    this.feedback.set(null);
    this.modal.set(this.canSchedule() ? { kind: 'create' } : { kind: 'blocked' });
  }

  protected openDetails(item: AgendaClassDto): void {
    this.feedback.set(null);
    this.modal.set({ kind: 'details', id: item.id });
  }

  protected openEdit(item: ClassDetailDto): void {
    this.modal.set({ kind: 'edit', item });
  }

  protected closeModal(): void {
    this.modal.set(null);
  }

  protected handleSaved(saved: ClassDetailDto, message: string): void {
    this.modal.set(null);
    /* Leva a agenda até a data salva: sem isso a aula pode cair fora da
     * semana visível e parecer que nada aconteceu. */
    this.anchorDate.set(dayOf(saved.scheduledAt));
    this.classes.reload();
    this.feedback.set(message);
  }
}

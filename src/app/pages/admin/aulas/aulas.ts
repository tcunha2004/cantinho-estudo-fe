import { DatePipe, DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { AgendaClassDto } from '../../../model/dto/agenda-class.dto';
import { ClassService } from '../../../service/class.service';
import { StudentService } from '../../../service/student.service';
import { Card } from '../../../shared/card/card';
import { ClassDetailsModal } from '../../agenda/class-details-modal';
import { CLASS_STATUS_DISPLAY } from '../../../shared/domain-display';
import { Icon } from '../../../shared/icon/icon';
import { monthRange } from '../../../shared/month';
import { PageHeader } from '../../../shared/page-header/page-header';
import { downloadPdf as printPdf } from '../../../shared/print-pdf';

/**
 * Todas as aulas do sistema, sem escopo de professor ou aluno — a listagem
 * que o admin usa para conferir o que aconteceu num período, com filtro de
 * aluno incluindo quem já tem contrato cancelado (histórico não some).
 */
@Component({
  selector: 'app-aulas',
  imports: [Card, ClassDetailsModal, DatePipe, Icon, PageHeader],
  templateUrl: './aulas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Aulas {
  private readonly document = inject(DOCUMENT);
  private readonly classService = inject(ClassService);

  protected readonly classStatus = CLASS_STATUS_DISPLAY;
  protected readonly students = toSignal(inject(StudentService).getAll(), { initialValue: [] });

  protected readonly from = signal(monthRange().from);
  protected readonly to = signal(monthRange().to);
  protected readonly studentFilter = signal('');
  protected readonly selectedClassId = signal<string | null>(null);

  private readonly classes = rxResource({
    params: () => ({
      from: this.from(),
      to: this.to(),
      ...(this.studentFilter() ? { studentId: this.studentFilter() } : {}),
    }),
    stream: ({ params }) => this.classService.getAgenda(params),
    defaultValue: [] as AgendaClassDto[],
  });

  protected readonly items = this.classes.value;
  protected readonly loading = this.classes.isLoading;
  protected readonly loadError = this.classes.error;

  protected readonly subtitle = computed(() => {
    const count = this.items().length;
    return count === 1 ? '1 aula' : `${count} aulas`;
  });

  protected openDetails(item: AgendaClassDto): void {
    this.selectedClassId.set(item.id);
  }

  protected closeDetails(): void {
    this.selectedClassId.set(null);
  }

  protected downloadPdf(): void {
    printPdf(this.document, 'Aulas - Cantinho do Estudo');
  }
}

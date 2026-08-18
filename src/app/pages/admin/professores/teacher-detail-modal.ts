import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { TeacherDetailDto } from '../../../model/dto/teacher-detail.dto';
import { TeacherService, UpdateTeacherPayload } from '../../../service/teacher.service';
import { SubjectService } from '../../../service/subject.service';
import { Icon } from '../../../shared/icon/icon';
import { initials } from '../../../shared/initials';
import { Modal } from '../../../shared/modal/modal';

/**
 * Visualização e edição de um professor para o admin. Mesmo esquema do
 * `StudentDetailModal`: nasce em leitura, "Editar" troca para formulário,
 * inativar tem confirmação inline.
 */
@Component({
  selector: 'app-teacher-detail-modal',
  imports: [Icon, Modal, ReactiveFormsModule],
  templateUrl: './teacher-detail-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherDetailModal {
  readonly teacherId = input.required<string>();

  readonly closed = output<void>();
  readonly changed = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly teacherService = inject(TeacherService);
  private readonly subjectService = inject(SubjectService);
  private readonly modal = viewChild.required(Modal);

  protected readonly initials = initials;

  /*
   * Todas as matérias do sistema, para o checklist de edição. `/classes/form-options`
   * não serve aqui: pra admin ele devolve `subjects: []` de propósito (as
   * matérias vêm dentro de cada professor, porque lá o admin escolhe o
   * professor primeiro) — daqui é a lista mestra, sem professor nenhum
   * escolhido ainda.
   */
  protected readonly allSubjects = toSignal(this.subjectService.getAll(), { initialValue: [] });

  protected readonly item = rxResource({
    params: () => this.teacherId(),
    stream: ({ params }) => this.teacherService.getById(params),
  });

  protected readonly editing = signal(false);
  protected readonly confirmingInactivate = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    bio: [''],
  });

  protected readonly selectedSubjectIds = signal<string[]>([]);

  protected startEdit(teacher: TeacherDetailDto): void {
    this.form.setValue({ name: teacher.name, email: teacher.email, bio: teacher.bio ?? '' });
    this.selectedSubjectIds.set(teacher.subjects.map((subject) => subject.id));
    this.errorMessage.set(null);
    this.editing.set(true);
  }

  protected toggleSubject(subjectId: string, checked: boolean): void {
    const current = this.selectedSubjectIds();

    this.selectedSubjectIds.set(
      checked ? [...current, subjectId] : current.filter((id) => id !== subjectId),
    );
  }

  protected cancelEdit(): void {
    this.editing.set(false);
    this.errorMessage.set(null);
  }

  protected close(): void {
    this.modal().close();
  }

  protected handleSubmit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, email, bio } = this.form.getRawValue();

    this.save({ name, email, bio: bio.trim() || null, subjectIds: this.selectedSubjectIds() }, () =>
      this.editing.set(false),
    );
  }

  protected confirmInactivate(): void {
    this.save({ active: false }, () => this.confirmingInactivate.set(false));
  }

  /* Reversível e de baixo risco — sem passo de confirmação, diferente de inativar. */
  protected reactivate(): void {
    this.save({ active: true }, () => {});
  }

  private save(payload: UpdateTeacherPayload, onSuccess: () => void): void {
    this.saving.set(true);
    this.errorMessage.set(null);

    this.teacherService.update(this.teacherId(), payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.item.reload();
        this.changed.emit();
        onSuccess();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.errorMessage.set(this.toMessage(error));
      },
    });
  }

  private toMessage(error: HttpErrorResponse): string {
    const message = (error.error as { message?: string | string[] } | null)?.message;

    if (Array.isArray(message)) {
      return message[0];
    }

    return message ?? 'Não foi possível salvar o professor. Tente novamente.';
  }
}

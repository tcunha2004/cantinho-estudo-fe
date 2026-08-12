import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ClassDetailDto } from '../../model/dto/agenda-class.dto';
import { ClassFormOptionsDto } from '../../model/dto/class-form-options.dto';
import { LocationType } from '../../model/entity/class.model';
import { ClassPayload, ClassService } from '../../service/class.service';
import { Modal } from '../../shared/modal/modal';

const DURATIONS = [30, 45, 60, 90, 120];

const LOCATIONS: { value: LocationType; label: string }[] = [
  { value: 'school', label: 'No Cantinho' },
  { value: 'home', label: 'Casa do aluno' },
];

/**
 * Formulário de aula, usado tanto para criar quanto para editar. Ele mesmo fala
 * com o `ClassService` e devolve a aula salva — o mesmo arranjo da tela de
 * login, que conversa direto com o `Session`.
 *
 * O professor não escolhe professor (é sempre ele) nem vê matéria que não
 * leciona; o admin escolhe o professor e a lista de matérias acompanha.
 */
@Component({
  selector: 'app-class-form-modal',
  imports: [ReactiveFormsModule, Modal],
  templateUrl: './class-form-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassFormModal {
  readonly options = input.required<ClassFormOptionsDto>();
  /* Admin escolhe o professor; professor agenda sempre para si. */
  readonly showTeacher = input(false);
  /* Preenchido em edição; null quando é uma aula nova. */
  readonly initial = input<ClassDetailDto | null>(null);

  readonly saved = output<ClassDetailDto>();
  readonly closed = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly classService = inject(ClassService);
  private readonly modal = viewChild.required(Modal);

  protected readonly durations = DURATIONS;
  protected readonly locations = LOCATIONS;

  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    teacherId: [''],
    studentId: ['', Validators.required],
    subjectId: ['', Validators.required],
    date: ['', Validators.required],
    time: ['', Validators.required],
    durationMinutes: [60],
    locationType: ['school' as LocationType],
    notes: [''],
  });

  private readonly pickedTeacherId = toSignal(this.form.controls.teacherId.valueChanges, {
    initialValue: '',
  });

  /* Cada professor já vem com as próprias matérias, então trocar de professor
   * não custa uma nova requisição. */
  protected readonly subjects = computed(() => {
    if (!this.showTeacher()) {
      return this.options().subjects;
    }

    const teacherId = this.pickedTeacherId() || this.initial()?.teacher.id || '';

    return this.options().teachers.find((teacher) => teacher.id === teacherId)?.subjects ?? [];
  });

  constructor() {
    /* Trocar de professor invalida a matéria escolhida. */
    this.form.controls.teacherId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.form.controls.subjectId.setValue(''));

    /*
     * Inputs só existem depois da construção, então a carga inicial mora num
     * effect. Ambos são estáveis enquanto o modal vive — ele nasce novo a cada
     * abertura —, e a carga é silenciosa para não disparar a limpeza acima.
     */
    effect(() => {
      const teacher = this.form.controls.teacherId;
      teacher.setValidators(this.showTeacher() ? Validators.required : null);
      teacher.updateValueAndValidity({ emitEvent: false });

      const item = this.initial();

      if (item) {
        this.form.patchValue(
          {
            teacherId: item.teacher.id,
            studentId: item.student.id,
            subjectId: item.subject.id,
            date: item.scheduledAt.slice(0, 10),
            time: item.scheduledAt.slice(11, 16),
            durationMinutes: item.durationMinutes,
            locationType: item.locationType,
            notes: item.notes ?? '',
          },
          { emitEvent: false },
        );
      }
    });
  }

  protected close(): void {
    this.modal().close();
  }

  protected handleSubmit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const { teacherId, studentId, subjectId, date, time, durationMinutes, locationType, notes } =
      this.form.getRawValue();

    const payload: ClassPayload = {
      studentId,
      subjectId,
      /* Hora local sem fuso — é assim que o backend guarda o horário da aula. */
      scheduledAt: `${date}T${time}:00`,
      durationMinutes,
      locationType,
      /* Sempre enviado, inclusive vazio: é assim que dá para apagar uma observação. */
      notes: notes.trim(),
      ...(this.showTeacher() ? { teacherId } : {}),
    };

    const item = this.initial();

    this.saving.set(true);
    this.errorMessage.set(null);

    const request = item
      ? this.classService.update(item.id, payload)
      : this.classService.create(payload);

    request.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.saved.emit(saved);
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.errorMessage.set(this.toMessage(error));
      },
    });
  }

  /* O backend já devolve mensagens prontas para o usuário (horário ocupado,
   * aluno sem contrato ativo, matéria fora das do professor). */
  private toMessage(error: HttpErrorResponse): string {
    const message = (error.error as { message?: string | string[] } | null)?.message;

    if (Array.isArray(message)) {
      return message[0];
    }

    return message ?? 'Não foi possível salvar a aula. Tente novamente.';
  }
}

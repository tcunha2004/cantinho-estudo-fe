import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SignupFormDto } from '../../model/dto/signup-form.dto';
import { SignupLinkService } from '../../service/signup-link.service';
import { Icon } from '../../shared/icon/icon';
import { passwordsMatch } from '../../shared/passwords-match';

/**
 * Cadastro do professor pelo link que o admin enviou. Tela pública, como a do
 * aluno: quem preenche ainda não existe no sistema, então não há sessão — o
 * segredo é o próprio id do link.
 *
 * É uma página só, não fases: professor tem menos a informar que aluno (não há
 * responsáveis, região nem plano). O envio salva o rascunho e o deixa
 * aguardando a aprovação do admin — nada vira professor aqui.
 */
@Component({
  selector: 'app-cadastro-professor',
  imports: [Icon, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-dvh bg-cream p-6">
      <div class="mx-auto w-full max-w-2xl">
        <header class="mb-8 flex flex-col items-center text-center">
          <img
            src="cantinho-estudo-logo.jpeg"
            alt="Cantinho do Estudo — desde 2003"
            class="w-full max-w-56"
          />
        </header>

        @if (loading()) {
          <p class="text-center text-ink-soft">Carregando…</p>
        } @else if (loadError(); as message) {
          <div
            class="mx-auto max-w-md rounded-3xl border border-line bg-white p-8 text-center shadow-sm"
          >
            <h1 class="font-display text-2xl font-bold">Link indisponível</h1>
            <p class="mt-3 text-ink-soft">{{ message }}</p>
          </div>
        } @else if (sent()) {
          <div
            class="mx-auto max-w-md rounded-3xl border border-line bg-white p-8 text-center shadow-sm"
          >
            <span
              class="mx-auto flex size-14 items-center justify-center rounded-full bg-subject-green/15 text-subject-green"
            >
              <app-icon name="check" class="size-7" />
            </span>
            <h1 class="mt-5 font-display text-2xl font-bold">Seus dados foram enviados</h1>
            <p class="mt-3 text-ink-soft">
              A escola vai conferir o cadastro e liberar o seu acesso. Em breve entramos em contato.
            </p>
          </div>
        } @else {
          <form
            [formGroup]="form"
            (ngSubmit)="submit()"
            class="rounded-3xl border border-line bg-white p-6 shadow-sm"
          >
            <h1 class="font-display text-2xl font-bold">Dados do professor</h1>
            <p class="mt-1 text-ink-soft">
              Preencha seus dados, as matérias que você leciona e uma apresentação. A escola confere
              e libera o seu acesso.
            </p>

            <div class="mt-6 grid gap-4 sm:grid-cols-2">
              <label class="block sm:col-span-2">
                <span class="text-sm font-bold">Nome completo</span>
                <input formControlName="name" type="text" class="field mt-1.5 w-full" />
              </label>

              <label class="block sm:col-span-2">
                <span class="text-sm font-bold">E-mail</span>
                <input formControlName="email" type="email" class="field mt-1.5 w-full" />
              </label>

              <label class="block">
                <span class="text-sm font-bold">Senha</span>
                <input
                  formControlName="password"
                  type="password"
                  autocomplete="new-password"
                  class="field mt-1.5 w-full"
                />
              </label>

              <label class="block">
                <span class="text-sm font-bold">Confirme a senha</span>
                <input
                  formControlName="passwordConfirm"
                  type="password"
                  autocomplete="new-password"
                  class="field mt-1.5 w-full"
                />
              </label>
            </div>

            @if (form.errors?.['passwordMismatch'] && form.controls.passwordConfirm.touched) {
              <p class="mt-2 text-sm font-bold text-red-600">As senhas não são iguais.</p>
            }

            <fieldset class="mt-6">
              <legend class="text-sm font-bold">Matérias que você leciona</legend>

              <div class="mt-2 flex flex-wrap gap-2">
                @for (subject of subjects(); track subject.id) {
                  <label
                    class="cursor-pointer rounded-full border px-4 py-2 text-sm font-bold transition-colors"
                    [class]="
                      picked().has(subject.id)
                        ? 'border-accent bg-accent-soft text-accent'
                        : 'border-line text-ink-soft hover:border-accent'
                    "
                  >
                    <input
                      type="checkbox"
                      class="sr-only"
                      [checked]="picked().has(subject.id)"
                      (change)="toggle(subject.id)"
                    />
                    {{ subject.name }}
                  </label>
                } @empty {
                  <p class="text-ink-soft">Nenhuma matéria cadastrada. Fale com a escola.</p>
                }
              </div>
            </fieldset>

            <label class="mt-6 block">
              <span class="text-sm font-bold">Apresentação</span>
              <textarea
                formControlName="bio"
                rows="4"
                placeholder="Formação, experiência e como você dá aula."
                class="field mt-1.5 w-full"
              ></textarea>
            </label>

            @if (errorMessage(); as message) {
              <p class="mt-6 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600">
                {{ message }}
              </p>
            }

            <div class="mt-8 flex justify-end border-t border-line pt-6">
              <button type="submit" class="btn-primary" [disabled]="saving() || !valid()">
                {{ saving() ? 'Enviando…' : 'Enviar' }}
              </button>
            </div>
          </form>
        }
      </div>
    </main>
  `,
})
export class CadastroProfessor {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly signupLinkService = inject(SignupLinkService);

  private readonly linkId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly saving = signal(false);
  protected readonly sent = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      passwordConfirm: ['', Validators.required],
      bio: ['', [Validators.required, Validators.minLength(20)]],
    },
    { validators: passwordsMatch },
  );

  /*
   * Matérias escolhidas fora do formulário: é uma lista de marcados, não um
   * campo — um `Set` em sinal custa menos que um FormArray de booleanos.
   */
  protected readonly picked = signal(new Set<string>());

  private readonly draft = rxResource({
    params: () => this.linkId,
    stream: ({ params }) => this.signupLinkService.getForm(params),
  });

  protected readonly loading = this.draft.isLoading;

  protected readonly subjects = computed(() =>
    this.draft.hasValue() ? this.draft.value().subjects : [],
  );

  /* 404 (link inexistente) e 410 (já enviado) são telas, não erro de sistema. */
  protected readonly loadError = computed(() => {
    const error = this.draft.error() as HttpErrorResponse | undefined;

    if (!error) {
      return null;
    }

    return error.status === 410
      ? 'Este cadastro já foi enviado. Aguarde o contato da escola.'
      : 'Link de cadastro inválido ou não encontrado.';
  });

  /*
   * Contador de revalidações — sem ele o botão não reage ao último campo
   * preenchido, porque o `status` do formulário não é um sinal.
   */
  private readonly formRevision = signal(0);

  protected readonly valid = computed(() => {
    this.formRevision();
    return this.form.valid && this.picked().size > 0;
  });

  constructor() {
    /* Repõe o que já foi enviado antes — a senha nunca volta do backend. */
    effect(() => {
      if (this.draft.hasValue()) {
        this.restore(this.draft.value());
      }
    });

    this.form.statusChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.formRevision.update((revision) => revision + 1));
  }

  protected toggle(subjectId: string): void {
    this.picked.update((current) => {
      const next = new Set(current);
      next.has(subjectId) ? next.delete(subjectId) : next.add(subjectId);
      return next;
    });
  }

  /*
   * Salva e envia numa tacada: é uma página só, então não há "próximo" onde
   * salvar antes. Se o envio falhar, o rascunho já está gravado e recarregar a
   * página traz tudo de volta (menos a senha).
   */
  protected submit(): void {
    if (!this.valid() || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, email, password, bio } = this.form.getRawValue();

    this.saving.set(true);
    this.errorMessage.set(null);

    this.signupLinkService
      .saveDraft(this.linkId, {
        studentName: name,
        studentEmail: email,
        password,
        bio: bio.trim(),
        subjectIds: [...this.picked()],
      })
      .subscribe({
        next: () => this.send(),
        error: (error: HttpErrorResponse) => this.fail(error),
      });
  }

  private send(): void {
    this.signupLinkService.submit(this.linkId).subscribe({
      next: () => {
        this.saving.set(false);
        this.sent.set(true);
      },
      error: (error: HttpErrorResponse) => this.fail(error),
    });
  }

  private fail(error: HttpErrorResponse): void {
    this.saving.set(false);
    this.errorMessage.set(this.toMessage(error));
  }

  private restore(draft: SignupFormDto): void {
    this.form.patchValue(
      {
        name: draft.studentName ?? '',
        email: draft.studentEmail ?? '',
        bio: draft.bio ?? '',
      },
      { emitEvent: false },
    );

    if (draft.subjectIds?.length) {
      this.picked.set(new Set(draft.subjectIds));
    }
  }

  private toMessage(error: HttpErrorResponse): string {
    const message = (error.error as { message?: string | string[] } | null)?.message;

    if (Array.isArray(message)) {
      return message[0];
    }

    return message ?? 'Não foi possível enviar. Tente novamente.';
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { SignupLinkService } from '../../service/signup-link.service';
import { SignupRole } from '../../model/entity/signup-link.model';
import { Icon } from '../../shared/icon/icon';
import { Modal } from '../../shared/modal/modal';

/* O que muda de aluno para professor é o texto — o resto é o mesmo link. */
const LABELS = {
  student: {
    title: 'Novo contrato',
    emailLabel: 'E-mail do aluno',
    emailPlaceholder: 'aluno@email.com',
    /* Cada papel tem o seu formulário público. */
    path: '/cadastro',
    intro:
      'Ao gerar, um link é criado para o aluno preencher os próprios dados: cadastro, responsáveis e plano. Quando ele enviar, o cadastro aparece nas suas notificações para conferência e aprovação — só então o contrato é criado.',
    ready:
      'Envie este link para o aluno. Ele preenche os dados e o cadastro volta aqui para você aprovar.',
  },
  professor: {
    title: 'Novo professor',
    emailLabel: 'E-mail do professor',
    emailPlaceholder: 'professor@email.com',
    path: '/cadastro/professor',
    intro:
      'Ao gerar, um link é criado para o professor preencher os próprios dados: cadastro, matérias que leciona e apresentação. Quando ele enviar, o cadastro aparece nas suas notificações para conferência e aprovação — só então ele passa a existir no sistema.',
    ready:
      'Envie este link para o professor. Ele preenche os dados e o cadastro volta aqui para você aprovar.',
  },
} as const;

/**
 * Entrada de gente nova: o admin gera um link e envia para a pessoa preencher
 * o cadastro. A janela tem dois estados — antes de gerar (explicação + Gerar) e
 * depois (o link pronto para copiar). Nada é criado no sistema aqui: aluno e
 * professor só passam a existir quando o admin aprova o cadastro enviado.
 */
@Component({
  selector: 'app-signup-link-modal',
  imports: [Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [title]="labels().title" (closed)="closed.emit()">
      @if (url(); as link) {
        <p class="mt-1 text-sm text-ink-soft">{{ labels().ready }}</p>

        <div class="mt-5 flex items-center gap-2 rounded-2xl bg-cream p-2">
          <input
            #linkInput
            type="text"
            readonly
            [value]="link"
            aria-label="Link de cadastro"
            class="field flex-1 truncate font-mono text-xs"
            (focus)="linkInput.select()"
          />
          <button
            type="button"
            (click)="copy(link)"
            [attr.aria-label]="copied() ? 'Link copiado' : 'Copiar link'"
            class="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-ink-soft transition-colors hover:border-accent hover:text-accent"
          >
            <app-icon [name]="copied() ? 'check' : 'copy'" class="size-5" />
          </button>
        </div>

        @if (copied()) {
          <p class="mt-2 text-xs font-bold text-subject-green">Link copiado.</p>
        }

        <div class="mt-6 flex justify-end">
          <button type="button" class="btn-primary" (click)="close()">Fechar</button>
        </div>
      } @else {
        <p class="mt-1 text-ink-soft">{{ labels().intro }}</p>

        <label class="mt-5 block">
          <span class="text-sm font-bold text-ink">{{ labels().emailLabel }}</span>
          <input
            #emailInput
            id="linkStudentEmail"
            type="email"
            autocomplete="off"
            [placeholder]="labels().emailPlaceholder"
            [value]="email()"
            (input)="email.set(emailInput.value.trim())"
            class="field mt-1.5 w-full"
          />
          <span class="mt-1.5 block text-xs text-ink-soft">
            Se já houver um link pendente para este e-mail, ele deixa de valer.
          </span>
        </label>

        @if (errorMessage(); as message) {
          <p class="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600">
            {{ message }}
          </p>
        }

        <div class="mt-6 flex justify-end gap-3">
          <button type="button" class="btn-secondary" (click)="close()">Cancelar</button>
          <button
            type="button"
            class="btn-primary"
            [disabled]="generating() || !emailFilled()"
            (click)="generate()"
          >
            {{ generating() ? 'Gerando…' : 'Gerar' }}
          </button>
        </div>
      }
    </app-modal>
  `,
})
export class SignupLinkModal {
  /* Aluno é o padrão: o fluxo do aluno veio primeiro e é o mais usado. */
  readonly role = input<SignupRole>('student');
  readonly closed = output<void>();

  private readonly signupLinkService = inject(SignupLinkService);
  private readonly modal = viewChild.required(Modal);

  protected readonly labels = computed(() => LABELS[this.role()]);

  protected readonly url = signal<string | null>(null);
  protected readonly generating = signal(false);
  protected readonly copied = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /*
   * O e-mail identifica quem ainda não existe no sistema: é por ele que o
   * backend revoga um link pendente anterior e recusa quem já é usuário. O
   * formato é o backend que julga (`@IsEmail`); aqui só se cobre o campo vazio,
   * para o botão não disparar uma requisição garantida a falhar.
   */
  protected readonly email = signal('');
  protected readonly emailFilled = computed(() => this.email().includes('@'));

  protected generate(): void {
    if (this.generating() || !this.emailFilled()) {
      return;
    }

    this.generating.set(true);
    this.errorMessage.set(null);

    this.signupLinkService.create(this.email(), this.role()).subscribe({
      next: ({ id }) => {
        this.generating.set(false);
        /* O link é do app, não da API — origin resolve dev e produção. */
        this.url.set(`${window.location.origin}${this.labels().path}/${id}`);
      },
      error: (error: HttpErrorResponse) => {
        this.generating.set(false);
        this.errorMessage.set(
          error.status === 409
            ? 'Já existe um usuário com este e-mail.'
            : 'Não foi possível gerar o link. Tente novamente.',
        );
      },
    });
  }

  protected copy(link: string): void {
    void navigator.clipboard.writeText(link).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  protected close(): void {
    this.modal().close();
  }
}

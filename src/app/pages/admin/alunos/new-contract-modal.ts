import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { SignupLinkService } from '../../../service/signup-link.service';
import { Icon } from '../../../shared/icon/icon';
import { Modal } from '../../../shared/modal/modal';

/**
 * Início do contrato: o admin gera um link e envia para o aluno preencher o
 * cadastro. A janela tem dois estados — antes de gerar (explicação + Gerar) e
 * depois (o link pronto para copiar). Nada é criado no sistema aqui: o aluno
 * só vira aluno quando o admin aprova o cadastro enviado.
 */
@Component({
  selector: 'app-new-contract-modal',
  imports: [Icon, Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal title="Novo contrato" (closed)="closed.emit()">
      @if (url(); as link) {
        <p class="mt-1 text-sm text-ink-soft">
          Envie este link para o aluno. Ele preenche os dados e o cadastro volta aqui para você
          aprovar.
        </p>

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
        <p class="mt-1 text-ink-soft">
          Ao gerar, um link é criado para o aluno preencher os próprios dados: cadastro,
          responsáveis e plano. Quando ele enviar, o cadastro aparece nas suas notificações para
          conferência e aprovação — só então o contrato é criado.
        </p>

        @if (errorMessage(); as message) {
          <p class="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600">
            {{ message }}
          </p>
        }

        <div class="mt-6 flex justify-end gap-3">
          <button type="button" class="btn-secondary" (click)="close()">Cancelar</button>
          <button type="button" class="btn-primary" [disabled]="generating()" (click)="generate()">
            {{ generating() ? 'Gerando…' : 'Gerar' }}
          </button>
        </div>
      }
    </app-modal>
  `,
})
export class NewContractModal {
  readonly closed = output<void>();

  private readonly signupLinkService = inject(SignupLinkService);
  private readonly modal = viewChild.required(Modal);

  protected readonly url = signal<string | null>(null);
  protected readonly generating = signal(false);
  protected readonly copied = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected generate(): void {
    if (this.generating()) {
      return;
    }

    this.generating.set(true);
    this.errorMessage.set(null);

    this.signupLinkService.create().subscribe({
      next: ({ id }) => {
        this.generating.set(false);
        /* O link é do app, não da API — origin resolve dev e produção. */
        this.url.set(`${window.location.origin}/cadastro/${id}`);
      },
      error: () => {
        this.generating.set(false);
        this.errorMessage.set('Não foi possível gerar o link. Tente novamente.');
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

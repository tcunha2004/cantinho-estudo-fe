import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Janela modal do sistema. Usa o `<dialog>` nativo com `showModal()`, que já
 * entrega prender o foco, fechar no Esc, camada acima de tudo (sem briga de
 * z-index com o menu fixo) e fundo escurecido — tudo o que um overlay feito à
 * mão teria que reimplementar.
 *
 * Quem usa renderiza `<app-modal>` dentro de um `@if`: abrir é ligar o sinal,
 * fechar é o `closed` desligá-lo. Assim o conteúdo nasce zerado a cada abertura.
 */
@Component({
  selector: 'app-modal',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      (close)="closed.emit()"
      (click)="handleBackdropClick($event)"
      aria-labelledby="modal-title"
      class="m-auto w-full max-w-lg rounded-3xl border border-line bg-white p-0 shadow-lg backdrop:bg-ink/40"
    >
      <!-- O padding mora aqui dentro: com padding no próprio <dialog>, clicar
           nele contaria como clique no fundo e fecharia a janela sem querer. -->
      <div class="p-6">
        <header class="flex items-start justify-between gap-4">
          <h2 id="modal-title" class="font-display text-2xl font-bold">{{ title() }}</h2>
          <button
            type="button"
            (click)="close()"
            aria-label="Fechar"
            class="flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-white text-ink-soft transition-colors hover:border-accent hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            <app-icon name="x" class="size-4" />
          </button>
        </header>

        <ng-content />
      </div>
    </dialog>
  `,
})
export class Modal {
  readonly title = input.required<string>();
  readonly closed = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }

  close(): void {
    this.dialog().nativeElement.close();
  }

  /* O alvo só é o próprio <dialog> quando o clique cai fora do conteúdo. */
  protected handleBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) {
      this.close();
    }
  }
}

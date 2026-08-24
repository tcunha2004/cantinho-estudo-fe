import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { WaitingSignupDto } from '../../model/dto/waiting-signup.dto';
import { SignupLinkService } from '../../service/signup-link.service';
import { PLAN_DISPLAY, planPriceView } from '../../shared/domain-display';
import { Icon } from '../../shared/icon/icon';
import { Modal } from '../../shared/modal/modal';

/**
 * Sino de notificações do admin: cadastros que os alunos enviaram e estão
 * esperando o contrato ser gerado. A contagem é recarregada a cada navegação —
 * é o "ao carregar qualquer página do painel", sem polling.
 *
 * Selecionar um cadastro abre a conferência na mesma janela: os dados que o
 * aluno preencheu, o desconto que o admin quiser dar e a confirmação. Confirmar
 * é o que cria o aluno de verdade (ver SignupLinksService.approve no backend).
 */
@Component({
  selector: 'app-notifications',
  imports: [CurrencyPipe, DatePipe, Icon, Modal, ReactiveFormsModule],
  templateUrl: './notifications.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Notifications {
  private readonly router = inject(Router);
  private readonly signupLinkService = inject(SignupLinkService);

  protected readonly planDisplay = PLAN_DISPLAY;

  /* Cada navegação vira um valor novo, e o resource refaz a busca. */
  private readonly navigation = toSignal(
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)),
    { initialValue: null },
  );

  private readonly waiting = rxResource({
    params: () => this.navigation(),
    stream: () => this.signupLinkService.getWaiting(),
    defaultValue: [],
  });

  protected readonly items = this.waiting.value;
  protected readonly count = computed(() => this.items().length);

  protected readonly open = signal(false);
  protected readonly selected = signal<WaitingSignupDto | null>(null);
  protected readonly approving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  /* Nome do aluno recém-ativado — não nulo enquanto o aviso está na tela. */
  protected readonly approvedName = signal<string | null>(null);

  /* `input[type=number]` entrega número (ou nulo quando vazio), não texto. */
  protected readonly discount = new FormControl<number | null>(null);

  /*
   * Preço do plano — mensalidade, valor por aula ou pacote, conforme o tipo
   * (ver planPriceView). É o valor cheio, sem desconto.
   */
  protected readonly price = computed(() => {
    const item = this.selected();
    return item ? planPriceView(item) : null;
  });

  /* O mesmo preço com o desconto que o admin está digitando agora. */
  protected readonly discountedPrice = computed(
    () => (this.price()?.amount ?? 0) * (1 - (this.discountValue() ?? 0) / 100),
  );

  private readonly discountValue = toSignal(this.discount.valueChanges, { initialValue: null });

  protected openModal(): void {
    this.open.set(true);
    this.selected.set(null);
    this.approvedName.set(null);
    this.errorMessage.set(null);
  }

  protected select(item: WaitingSignupDto): void {
    this.selected.set(item);
    this.approvedName.set(null);
    this.errorMessage.set(null);
    this.discount.setValue(null);
  }

  protected backToList(): void {
    this.selected.set(null);
    this.errorMessage.set(null);
  }

  protected approve(): void {
    const item = this.selected();

    if (!item || this.approving()) {
      return;
    }

    this.approving.set(true);
    this.errorMessage.set(null);

    /* O backend guarda desconto como decimal em string. */
    const discountPercentage = this.discount.value === null ? null : String(this.discount.value);

    this.signupLinkService.approve(item.id, discountPercentage).subscribe({
      next: () => {
        this.approving.set(false);
        this.approvedName.set(item.studentName);
        this.selected.set(null);
        this.waiting.reload();
      },
      error: (error: HttpErrorResponse) => {
        this.approving.set(false);
        this.errorMessage.set(this.toMessage(error));
      },
    });
  }

  private toMessage(error: HttpErrorResponse): string {
    const message = (error.error as { message?: string | string[] } | null)?.message;

    if (Array.isArray(message)) {
      return message[0];
    }

    return message ?? 'Não foi possível aprovar o cadastro. Tente novamente.';
  }
}

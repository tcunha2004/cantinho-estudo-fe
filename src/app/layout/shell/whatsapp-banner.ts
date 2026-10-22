import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { WhatsappState } from '../../model/dto/whatsapp.dto';
import { WhatsappService } from '../../service/whatsapp.service';

const MESSAGES: Record<Exclude<WhatsappState, 'connected'>, string> = {
  disconnected: 'WhatsApp desconectado: os alunos não estão recebendo mensagens.',
  connecting: 'WhatsApp desconectado: os alunos não estão recebendo mensagens.',
  not_configured: 'WhatsApp não configurado no servidor.',
  unreachable: 'Não foi possível verificar o WhatsApp.',
};

/**
 * Faixa de alerta do painel do admin: aparece em qualquer página enquanto o
 * WhatsApp não estiver conectado, porque sem ela os alunos ficariam sem
 * mensagem sem ninguém saber. Consulta a cada navegação (o backend guarda 30 s
 * de cache) e guarda o resultado em `WhatsappService.status`, que o modal de
 * aprovação lê. Erro na consulta não mostra faixa — não dá para afirmar nada.
 */
@Component({
  selector: 'app-whatsapp-banner',
  imports: [RouterLink],
  templateUrl: './whatsapp-banner.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatsappBanner {
  private readonly router = inject(Router);
  private readonly whatsappService = inject(WhatsappService);

  /* Cada navegação vira um valor novo, e o resource refaz a busca. */
  private readonly navigation = toSignal(
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)),
    { initialValue: null },
  );

  /* A página do WhatsApp já mostra o estado — e consulta com `fresh`. */
  private readonly onWhatsappPage = computed(() =>
    (this.navigation()?.urlAfterRedirects ?? this.router.url).startsWith('/whatsapp'),
  );

  /*
   * O resultado vai para `whatsappService.status`; o valor do resource não é
   * lido. Fica ocioso (params indefinido) na página do WhatsApp: uma resposta
   * com cache chegando por último sobrescreveria o status fresco da página.
   */
  private readonly check = rxResource({
    params: () => (this.onWhatsappPage() ? undefined : this.navigation()),
    stream: () => this.whatsappService.getStatus(),
  });

  protected readonly message = computed(() => {
    const state = this.whatsappService.status()?.state;

    if (!state || state === 'connected' || this.onWhatsappPage()) {
      return null;
    }

    return MESSAGES[state];
  });
}

import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { WhatsappFailureDto } from '../../../model/dto/whatsapp.dto';
import { WhatsappService } from '../../../service/whatsapp.service';
import { Card } from '../../../shared/card/card';
import { PageHeader } from '../../../shared/page-header/page-header';

/* De quanto em quanto tempo a página consulta o status enquanto espera a leitura do QR. */
export const POLL_MS = 3000;

/* A UAZAPI pode mandar o QR já como data URI ou só o base64 da imagem. */
export function qrSrc(qrcode: string): string {
  return qrcode.startsWith('data:') ? qrcode : `data:image/png;base64,${qrcode}`;
}

/* '5531999999999' → '+55 31 99999-9999'; qualquer outro formato volta como veio. */
export function formatPhone(phone: string): string {
  const match = /^55(\d{2})(\d{5})(\d{4})$/.exec(phone);
  return match ? `+55 ${match[1]} ${match[2]}-${match[3]}` : phone;
}

/**
 * Conexão do WhatsApp do admin: gera o QR, acompanha a leitura e lista as
 * mensagens que não saíram, para reenviar ou descartar.
 *
 * Aguardando leitura, a página consulta o status sozinha (POLL_MS). O polling
 * é derivado do estado: quando ele deixa de ser "connecting" — conectou, ou o
 * QR expirou e voltou a "disconnected" — o intervalo é desfeito, sem estado
 * próprio para esquecer de limpar.
 */
@Component({
  selector: 'app-whatsapp',
  imports: [Card, DatePipe, PageHeader],
  templateUrl: './whatsapp.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Whatsapp {
  private readonly whatsappService = inject(WhatsappService);

  protected readonly status = this.whatsappService.status;
  protected readonly qrSrc = qrSrc;
  protected readonly formatPhone = formatPhone;

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly working = signal(false);
  /* Mensagens com reenvio ou descarte em andamento. */
  protected readonly busyIds = signal<string[]>([]);

  /* Enquanto a primeira consulta não volta, a tela não mostra estado nenhum. */
  protected readonly loading = signal(true);
  private readonly checkFailed = signal(false);

  private readonly failuresResource = rxResource({
    params: () => ({}),
    stream: () => this.whatsappService.getFailures(),
    defaultValue: [] as WhatsappFailureDto[],
  });

  /* Falha de rede na consulta se comporta como "inalcançável". */
  protected readonly state = computed(() =>
    this.checkFailed() ? 'unreachable' : (this.status()?.state ?? null),
  );

  protected readonly failures = computed(() =>
    this.failuresResource.hasValue() ? this.failuresResource.value() : [],
  );
  protected readonly failuresError = this.failuresResource.error;

  private readonly waitingForScan = computed(() => this.state() === 'connecting');

  constructor() {
    this.check();

    effect((onCleanup) => {
      if (!this.waitingForScan()) {
        return;
      }

      const id = setInterval(() => this.refresh(), POLL_MS);
      onCleanup(() => clearInterval(id));
    });
  }

  protected connect(): void {
    this.run(this.whatsappService.connect());
  }

  protected disconnect(): void {
    const confirmed = window.confirm(
      'Desconectar o WhatsApp? Os alunos deixam de receber mensagens até você conectar de novo.',
    );

    if (confirmed) {
      this.run(this.whatsappService.disconnect());
    }
  }

  protected retry(): void {
    this.check();
  }

  protected resend(item: WhatsappFailureDto): void {
    this.busy(item.id, true);
    this.errorMessage.set(null);

    this.whatsappService.resend(item.id).subscribe({
      next: (result) => {
        this.busy(item.id, false);
        this.failuresResource.value.update((list) =>
          result.status === 'sent'
            ? list.filter((row) => row.id !== item.id)
            : list.map((row) =>
                row.id === item.id ? { ...row, error: result.error ?? row.error } : row,
              ),
        );
      },
      error: (error: HttpErrorResponse) => this.rowFailed(item.id, error),
    });
  }

  protected discard(item: WhatsappFailureDto): void {
    if (!window.confirm('Descartar esta mensagem? Ela não será enviada.')) {
      return;
    }

    this.busy(item.id, true);
    this.errorMessage.set(null);

    this.whatsappService.discard(item.id).subscribe({
      next: () => {
        this.busy(item.id, false);
        this.failuresResource.value.update((list) => list.filter((row) => row.id !== item.id));
      },
      error: (error: HttpErrorResponse) => this.rowFailed(item.id, error),
    });
  }

  /*
   * A primeira consulta é a que vale: o status guardado pela faixa do shell
   * pode estar velho (até 30 s de cache). Também serve ao "Tentar de novo".
   */
  private check(): void {
    this.whatsappService.getStatus(true).subscribe({
      next: () => {
        this.checkFailed.set(false);
        this.loading.set(false);
      },
      error: () => {
        this.checkFailed.set(true);
        this.loading.set(false);
      },
    });
  }

  /* Consulta do polling: o resultado vai para `status`, erro de rede é ignorado. */
  private refresh(): void {
    this.whatsappService.getStatus(true).subscribe({ error: () => undefined });
  }

  private run(request: ReturnType<WhatsappService['connect']>): void {
    this.working.set(true);
    this.errorMessage.set(null);

    request.subscribe({
      next: () => this.working.set(false),
      error: (error: HttpErrorResponse) => {
        this.working.set(false);
        this.errorMessage.set(this.toMessage(error));
      },
    });
  }

  /* Já foi enviada ou descartada por outro caminho: recarrega a lista de verdade. */
  private rowFailed(id: string, error: HttpErrorResponse): void {
    this.busy(id, false);
    this.errorMessage.set(this.toMessage(error));
    this.failuresResource.reload();
  }

  private busy(id: string, on: boolean): void {
    this.busyIds.update((ids) => (on ? [...ids, id] : ids.filter((item) => item !== id)));
  }

  private toMessage(error: HttpErrorResponse): string {
    const message = (error.error as { message?: string | string[] } | null)?.message;

    if (Array.isArray(message)) {
      return message[0];
    }

    return message ?? 'Não foi possível concluir. Tente novamente.';
  }
}

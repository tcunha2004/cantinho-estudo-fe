import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
  WhatsappFailureDto,
  WhatsappResendResultDto,
  WhatsappStatusDto,
} from '../model/dto/whatsapp.dto';
import { ApiClient } from './api-client';

/** WhatsApp do admin — conexão e mensagens que falharam. Tudo é só do admin. */
@Injectable({ providedIn: 'root' })
export class WhatsappService {
  private readonly api = inject(ApiClient);

  /**
   * Último status conhecido; nulo = ainda não consultado. Quem lê não dispara
   * requisição: a faixa do shell consulta a cada navegação e alimenta este
   * signal, e o modal de aprovação só lê.
   */
  readonly status = signal<WhatsappStatusDto | null>(null);

  /** `fresh` ignora o cache de 30 s do backend — usado pela página de conexão. */
  getStatus(fresh = false): Observable<WhatsappStatusDto> {
    return this.api
      .get<WhatsappStatusDto>('/whatsapp/status', fresh ? { fresh: true } : undefined)
      .pipe(tap((status) => this.status.set(status)));
  }

  /** Cria a instância se preciso e devolve o QR code para ler no celular. */
  connect(): Observable<WhatsappStatusDto> {
    return this.api
      .post<WhatsappStatusDto>('/whatsapp/connect', {})
      .pipe(tap((status) => this.status.set(status)));
  }

  disconnect(): Observable<WhatsappStatusDto> {
    return this.api
      .post<WhatsappStatusDto>('/whatsapp/disconnect', {})
      .pipe(tap((status) => this.status.set(status)));
  }

  /** Mensagens que falharam ou ficaram pela metade. */
  getFailures(): Observable<WhatsappFailureDto[]> {
    return this.api.get<WhatsappFailureDto[]>('/whatsapp/messages/failures');
  }

  resend(id: string): Observable<WhatsappResendResultDto> {
    return this.api.post<WhatsappResendResultDto>(`/whatsapp/messages/${id}/resend`, {});
  }

  discard(id: string): Observable<void> {
    return this.api.patch<void>(`/whatsapp/messages/${id}/discard`, {});
  }
}

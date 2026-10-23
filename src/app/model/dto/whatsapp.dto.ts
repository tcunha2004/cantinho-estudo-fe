/* Espelho dos DTOs de `api/src/whatsapp/dto` — mudou lá, muda aqui. */

export type WhatsappState =
  'not_configured' | 'disconnected' | 'connecting' | 'connected' | 'unreachable';

export interface WhatsappStatusDto {
  state: WhatsappState;
  /** Só em `connecting`. */
  qrcode: string | null;
  /** Só em `connected`. */
  phone: string | null;
  /** Só em `connected`. */
  profileName: string | null;
}

export interface WhatsappFailureDto {
  id: string;
  /* Aluno ou professor dono da mensagem. */
  recipientName: string | null;
  phone: string;
  text: string;
  error: string;
  createdAt: string;
}

export interface WhatsappResendResultDto {
  id: string;
  status: 'pending' | 'sent' | 'failed' | 'discarded';
  error: string | null;
}

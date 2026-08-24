import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { SignupDraftPayload, SignupFormDto } from '../model/dto/signup-form.dto';
import { SignupRole } from '../model/entity/signup-link.model';
import { WaitingSignupDto } from '../model/dto/waiting-signup.dto';
import { ApiClient } from './api-client';

@Injectable({ providedIn: 'root' })
export class SignupLinkService {
  private readonly api = inject(ApiClient);

  /*
   * Sobe a cada aprovação. Quem lista alunos ou professores depende disso para
   * não ficar desatualizado: o sino vive no shell, então aprovar um cadastro
   * cria gente sem que a tabela por baixo saiba de nada.
   */
  readonly approvals = signal(0);

  /*
   * Admin — gera o link que será enviado ao aluno ou ao professor. O e-mail
   * identifica quem vai preencher: gerar de novo para o mesmo e-mail revoga o
   * link anterior.
   */
  create(studentEmail: string, role: SignupRole): Observable<{ id: string }> {
    return this.api.post<{ id: string }>('/signup-links', {
      studentEmail,
      role,
    });
  }

  /* Admin — mata um link pendente antes do prazo. */
  revoke(id: string): Observable<void> {
    return this.api.patch<void>(`/signup-links/${id}/revoke`, {});
  }

  /* Público — rascunho + regiões/planos da tela de cadastro. */
  getForm(id: string): Observable<SignupFormDto> {
    return this.api.get<SignupFormDto>(`/signup-links/${id}/form`);
  }

  /* Público — salva a fase que o aluno acabou de preencher. */
  saveDraft(id: string, payload: SignupDraftPayload): Observable<void> {
    return this.api.patch<void>(`/signup-links/${id}`, payload);
  }

  /* Público — envio do formulário completo. */
  submit(id: string): Observable<void> {
    return this.api.post<void>(`/signup-links/${id}/submit`, {});
  }

  /* Admin — cadastros aguardando aprovação (sino e modal de notificações). */
  getWaiting(): Observable<WaitingSignupDto[]> {
    return this.api.get<WaitingSignupDto[]>('/signup-links/waiting');
  }

  /*
   * Admin — vira gente de verdade: aluno com contrato e primeira parcela, ou
   * professor com as matérias dele. Devolve o id do que foi criado.
   */
  approve(id: string, discountPercentage: string | null): Observable<{ id: string }> {
    return this.api
      .post<{ id: string }>(`/signup-links/${id}/approve`, { discountPercentage })
      .pipe(tap(() => this.approvals.update((total) => total + 1)));
  }
}

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../service/api.config';
import { Session } from './session';

/**
 * Anexa o `access_token` no header `Authorization` de toda requisição
 * destinada à API. Requisições para outros domínios seguem intactas.
 *
 * Um 401 em requisição autenticada significa token inválido ou expirado:
 * encerra a sessão e devolve o usuário para o login.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(Session);
  const router = inject(Router);
  const token = session.token();

  if (!token || !request.url.startsWith(API_BASE_URL)) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  ).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        session.logout();
        void router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }),
  );
};

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../service/api.config';
import { Auth } from './auth';

/**
 * Anexa o `access_token` no header `Authorization` de toda requisição
 * destinada à API. Requisições para outros domínios seguem intactas.
 *
 * Um 401 em requisição autenticada significa token inválido ou expirado:
 * encerra a sessão e devolve o usuário para o login.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const token = auth.token();

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
        auth.logout();
        void router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }),
  );
};

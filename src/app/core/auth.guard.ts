import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../model/entity/user.model';
import { HOME_BY_ROLE } from './home-by-role';
import { Session } from './session';

/**
 * Libera a rota apenas para quem tem token válido. Sem sessão, o acesso direto
 * por URL é redirecionado para o login.
 */
export const authGuard: CanActivateFn = () => {
  const session = inject(Session);
  const router = inject(Router);

  return session.isLoggedIn() || router.createUrlTree(['/login']);
};

/**
 * Restringe a rota aos papéis listados em `data.roles`. Quem está logado mas não
 * tem acesso volta para a própria home, em vez de ver uma tela de outro papel.
 */
export const roleGuard: CanActivateFn = (route) => {
  const session = inject(Session);
  const router = inject(Router);
  const role = session.role();

  if (!role) {
    return router.createUrlTree(['/login']);
  }

  const allowed = route.data['roles'] as UserRole[] | undefined;

  return allowed?.includes(role) || router.createUrlTree([HOME_BY_ROLE[role]]);
};

/**
 * Inverso do `authGuard`: mantém quem já tem sessão fora da tela de login.
 */
export const guestGuard: CanActivateFn = () => {
  const session = inject(Session);
  const router = inject(Router);
  const role = session.role();

  return role ? router.createUrlTree([HOME_BY_ROLE[role]]) : true;
};

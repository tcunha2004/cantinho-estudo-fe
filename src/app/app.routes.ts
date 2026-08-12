import { Route, Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/auth.guard';
import { UserRole } from './model/entity/user.model';

interface PageConfig {
  path: string;
  /* Nome exibido na aba do navegador e no cabeçalho das telas provisórias */
  title: string;
  /* Papéis com acesso à rota */
  roles: UserRole[];
  loadComponent: Route['loadComponent'];
}

/** Monta uma página interna: guarda de papel, título da aba e `data` padronizados. */
function page({ path, title, roles, loadComponent }: PageConfig): Route {
  return {
    path,
    loadComponent,
    canActivate: [roleGuard],
    data: { title, roles },
    title: `${title} · Cantinho do Estudo`,
  };
}

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
    canActivate: [guestGuard],
    title: 'Entrar · Cantinho do Estudo',
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    canActivate: [authGuard],
    children: [
      // admin
      page({
        path: 'painel',
        title: 'Painel',
        roles: ['admin'],
        loadComponent: () => import('./pages/admin/painel/painel').then((m) => m.Painel),
      }),
      page({
        path: 'alunos',
        title: 'Alunos',
        roles: ['admin'],
        loadComponent: () => import('./pages/admin/alunos/alunos').then((m) => m.Alunos),
      }),
      page({
        path: 'professores',
        title: 'Professores',
        roles: ['admin'],
        loadComponent: () =>
          import('./pages/admin/professores/professores').then((m) => m.Professores),
      }),
      page({
        path: 'info',
        title: 'Info',
        roles: ['admin'],
        loadComponent: () => import('./pages/admin/info/info').then((m) => m.Info),
      }),
      // compartilhada (admin, professor e aluno)
      page({
        path: 'agenda',
        title: 'Agenda',
        roles: ['admin', 'professor', 'student'],
        loadComponent: () => import('./pages/agenda/agenda').then((m) => m.Agenda),
      }),
      // professor
      page({
        path: 'aulas',
        title: 'Minhas aulas',
        roles: ['professor'],
        loadComponent: () => import('./pages/professor/aulas/aulas').then((m) => m.Aulas),
      }),
      page({
        path: 'ganhos',
        title: 'Meus ganhos',
        roles: ['professor'],
        loadComponent: () => import('./pages/professor/ganhos/ganhos').then((m) => m.Ganhos),
      }),
      // aluno
      page({
        path: 'plano',
        title: 'Meu plano',
        roles: ['student'],
        loadComponent: () => import('./pages/aluno/plano/plano').then((m) => m.Plano),
      }),
      page({
        path: 'pagamentos',
        title: 'Pagamentos',
        roles: ['student'],
        loadComponent: () =>
          import('./pages/aluno/pagamentos/pagamentos').then((m) => m.Pagamentos),
      }),
    ],
  },
];

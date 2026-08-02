import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/auth.guard';

const placeholder = () => import('./pages/placeholder/placeholder').then((m) => m.Placeholder);

const pageTitle = (name: string) => `${name} · Cantinho do Estudo`;

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
    canActivate: [guestGuard],
    title: pageTitle('Entrar'),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    canActivate: [authGuard],
    children: [
      // admin
      {
        path: 'painel',
        loadComponent: () => import('./pages/admin/painel/painel').then((m) => m.Painel),
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        title: pageTitle('Painel'),
      },
      {
        path: 'alunos',
        loadComponent: () => import('./pages/admin/alunos/alunos').then((m) => m.Alunos),
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        title: pageTitle('Alunos'),
      },
      {
        path: 'professores',
        loadComponent: () =>
          import('./pages/admin/professores/professores').then((m) => m.Professores),
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        title: pageTitle('Professores'),
      },
      {
        path: 'info',
        loadComponent: () => import('./pages/admin/info/info').then((m) => m.Info),
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        title: pageTitle('Info'),
      },
      // compartilhada (admin, professor e aluno)
      {
        path: 'agenda',
        loadComponent: placeholder,
        canActivate: [roleGuard],
        data: { title: 'Agenda', roles: ['admin', 'professor', 'student'] },
        title: pageTitle('Agenda'),
      },
      // professor
      {
        path: 'aulas',
        loadComponent: () => import('./pages/professor/aulas/aulas').then((m) => m.Aulas),
        canActivate: [roleGuard],
        data: { title: 'Minhas aulas', roles: ['professor'] },
        title: pageTitle('Minhas aulas'),
      },
      {
        path: 'ganhos',
        loadComponent: () => import('./pages/professor/ganhos/ganhos').then((m) => m.Ganhos),
        canActivate: [roleGuard],
        data: { title: 'Meus ganhos', roles: ['professor'] },
        title: pageTitle('Meus ganhos'),
      },
      // aluno
      {
        path: 'plano',
        loadComponent: () => import('./pages/aluno/plano/plano').then((m) => m.Plano),
        canActivate: [roleGuard],
        data: { roles: ['student'] },
        title: pageTitle('Meu plano'),
      },
      {
        path: 'pagamentos',
        loadComponent: () =>
          import('./pages/aluno/pagamentos/pagamentos').then((m) => m.Pagamentos),
        canActivate: [roleGuard],
        data: { roles: ['student'] },
        title: pageTitle('Pagamentos'),
      },
    ],
  },
];

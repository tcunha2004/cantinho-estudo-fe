import { Routes } from '@angular/router';

const placeholder = () => import('./pages/placeholder/placeholder').then((m) => m.Placeholder);

const pageTitle = (name: string) => `${name} · Cantinho do Estudo`;

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
    title: pageTitle('Entrar'),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    children: [
      // admin
      {
        path: 'painel',
        loadComponent: () => import('./pages/admin/painel/painel').then((m) => m.Painel),
        title: pageTitle('Painel'),
      },
      {
        path: 'alunos',
        loadComponent: () => import('./pages/admin/alunos/alunos').then((m) => m.Alunos),
        title: pageTitle('Alunos'),
      },
      {
        path: 'professores',
        loadComponent: () =>
          import('./pages/admin/professores/professores').then((m) => m.Professores),
        title: pageTitle('Professores'),
      },
      {
        path: 'financeiro',
        loadComponent: () =>
          import('./pages/admin/financeiro/financeiro').then((m) => m.Financeiro),
        title: pageTitle('Financeiro'),
      },
      // compartilhada (admin, professor e aluno)
      {
        path: 'agenda',
        loadComponent: placeholder,
        title: pageTitle('Agenda'),
        data: { title: 'Agenda' },
      },
      // professor
      {
        path: 'aulas',
        loadComponent: () => import('./pages/admin/aulas/aulas').then((m) => m.Aulas),
        title: pageTitle('Minhas aulas'),
        data: { title: 'Minhas aulas' },
      },
      {
        path: 'ganhos',
        loadComponent: () => import('./pages/admin/ganhos/ganhos').then((m) => m.Ganhos),
        title: pageTitle('Meus ganhos'),
        data: { title: 'Meus ganhos' },
      },
      // aluno
      {
        path: 'plano',
        loadComponent: placeholder,
        title: pageTitle('Meu plano'),
        data: { title: 'Meu plano' },
      },
      {
        path: 'pagamentos',
        loadComponent: placeholder,
        title: pageTitle('Pagamentos'),
        data: { title: 'Pagamentos' },
      },
    ],
  },
];

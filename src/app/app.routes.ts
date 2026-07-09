import { Routes } from '@angular/router';

const placeholder = () =>
  import('./pages/placeholder/placeholder').then((m) => m.Placeholder);

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
      { path: 'painel', loadComponent: placeholder, title: pageTitle('Painel'), data: { title: 'Painel' } },
      { path: 'alunos', loadComponent: placeholder, title: pageTitle('Alunos'), data: { title: 'Alunos' } },
      { path: 'professores', loadComponent: placeholder, title: pageTitle('Professores'), data: { title: 'Professores' } },
      { path: 'financeiro', loadComponent: placeholder, title: pageTitle('Financeiro'), data: { title: 'Financeiro' } },
      // compartilhada (admin, professor e aluno)
      { path: 'agenda', loadComponent: placeholder, title: pageTitle('Agenda'), data: { title: 'Agenda' } },
      // professor
      { path: 'aulas', loadComponent: placeholder, title: pageTitle('Minhas aulas'), data: { title: 'Minhas aulas' } },
      { path: 'ganhos', loadComponent: placeholder, title: pageTitle('Meus ganhos'), data: { title: 'Meus ganhos' } },
      // aluno
      { path: 'plano', loadComponent: placeholder, title: pageTitle('Meu plano'), data: { title: 'Meu plano' } },
      { path: 'pagamentos', loadComponent: placeholder, title: pageTitle('Pagamentos'), data: { title: 'Pagamentos' } },
    ],
  },
];

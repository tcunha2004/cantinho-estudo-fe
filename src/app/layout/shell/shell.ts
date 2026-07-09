import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Role, Session } from '../../core/session';
import { Icon, IconName } from '../../shared/icon/icon';

interface NavItem {
  label: string;
  path: string;
  icon: IconName;
}

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  admin: [
    { label: 'Painel', path: '/painel', icon: 'house' },
    { label: 'Agenda', path: '/agenda', icon: 'calendar' },
    { label: 'Alunos', path: '/alunos', icon: 'users' },
    { label: 'Professores', path: '/professores', icon: 'presentation' },
    { label: 'Financeiro', path: '/financeiro', icon: 'dollar' },
  ],
  professor: [
    { label: 'Minha agenda', path: '/agenda', icon: 'calendar' },
    { label: 'Minhas aulas', path: '/aulas', icon: 'book-open' },
    { label: 'Meus ganhos', path: '/ganhos', icon: 'coins' },
  ],
  aluno: [
    { label: 'Minha agenda', path: '/agenda', icon: 'calendar' },
    { label: 'Meu plano', path: '/plano', icon: 'clipboard-list' },
    { label: 'Pagamentos', path: '/pagamentos', icon: 'credit-card' },
  ],
};

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  private readonly session = inject(Session);
  private readonly router = inject(Router);

  protected readonly role = this.session.role;
  protected readonly navItems = computed(() => NAV_BY_ROLE[this.role()]);

  protected readonly roleOptions: { value: Role; label: string }[] = [
    { value: 'admin', label: 'Admin' },
    { value: 'professor', label: 'Prof.' },
    { value: 'aluno', label: 'Aluno' },
  ];

  /** Troca de papel apenas para pré-visualização, enquanto não há login real. */
  protected switchRole(role: Role): void {
    this.session.role.set(role);
    this.router.navigateByUrl(NAV_BY_ROLE[role][0].path);
  }
}

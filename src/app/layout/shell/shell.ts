import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Session } from '../../core/session';
import { UserRole } from '../../model/entity/user.model';
import { Icon, IconName } from '../../shared/icon/icon';
import { Notifications } from './notifications';

interface NavItem {
  label: string;
  path: string;
  icon: IconName;
}

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  admin: [
    { label: 'Painel', path: '/painel', icon: 'house' },
    { label: 'Agenda', path: '/agenda', icon: 'calendar' },
    { label: 'Aulas', path: '/admin/aulas', icon: 'book-open' },
    { label: 'Alunos', path: '/alunos', icon: 'users' },
    { label: 'Professores', path: '/professores', icon: 'presentation' },
    { label: 'Informações', path: '/info', icon: 'info' },
  ],
  professor: [
    { label: 'Minha agenda', path: '/agenda', icon: 'calendar' },
    { label: 'Minhas aulas', path: '/aulas', icon: 'book-open' },
    { label: 'Meus ganhos', path: '/ganhos', icon: 'coins' },
  ],
  student: [
    { label: 'Minha agenda', path: '/agenda', icon: 'calendar' },
    { label: 'Meu plano', path: '/plano', icon: 'clipboard-list' },
    { label: 'Pagamentos', path: '/pagamentos', icon: 'credit-card' },
  ],
};

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, Notifications],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  private readonly router = inject(Router);
  private readonly session = inject(Session);

  /* O sino de cadastros é do admin — os outros papéis não veem a barra. */
  protected readonly isAdmin = computed(() => this.session.role() === 'admin');

  protected readonly navItems = computed(() => {
    const role = this.session.role();
    return role ? NAV_BY_ROLE[role] : [];
  });

  protected logout(): void {
    this.session.logout();
    void this.router.navigateByUrl('/login');
  }
}

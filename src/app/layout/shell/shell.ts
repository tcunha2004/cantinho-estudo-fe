import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from '../../core/auth';
import { UserRole } from '../../model/entity/user.model';
import { Icon, IconName } from '../../shared/icon/icon';

interface NavItem {
  label: string;
  path: string;
  icon: IconName;
}

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  admin: [
    { label: 'Painel', path: '/painel', icon: 'house' },
    { label: 'Agenda', path: '/agenda', icon: 'calendar' },
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
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);

  protected readonly role = this.auth.role;
  protected readonly navItems = computed(() => {
    const role = this.role();
    return role ? NAV_BY_ROLE[role] : [];
  });

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}

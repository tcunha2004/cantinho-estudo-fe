import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

export type Role = 'admin' | 'professor' | 'aluno';

interface RoleOption {
  value: Role;
  label: string;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  protected readonly roles: RoleOption[] = [
    { value: 'aluno', label: 'Aluno' },
    { value: 'professor', label: 'Professor' },
    { value: 'admin', label: 'Admin' },
  ];

  protected readonly selectedRole = signal<Role>('aluno');
  protected readonly showPassword = signal(false);

  protected selectRole(role: Role): void {
    this.selectedRole.set(role);
  }

  protected togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }
}

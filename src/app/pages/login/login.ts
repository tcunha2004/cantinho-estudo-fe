import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../core/auth';
import { Role } from '../../core/session';

interface RoleOption {
  value: Role;
  label: string;
}

const HOME_BY_ROLE: Record<Role, string> = {
  admin: '/painel',
  professor: '/agenda',
  student: '/agenda',
};

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly roles: RoleOption[] = [
    { value: 'student', label: 'Aluno' },
    { value: 'professor', label: 'Professor' },
    { value: 'admin', label: 'Admin' },
  ];

  protected readonly selectedRole = signal<Role>('student');
  protected readonly showPassword = signal(false);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected selectRole(role: Role): void {
    this.selectedRole.set(role);
  }

  protected togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }

  protected handleSubmit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    const role = this.selectedRole();

    this.loading.set(true);
    this.errorMessage.set(null);

    this.auth.login(email, password, role).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl(HOME_BY_ROLE[role]);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err?.status === 401
            ? 'E-mail ou senha inválidos.'
            : 'Não foi possível entrar. Tente novamente.',
        );
      },
    });
  }
}

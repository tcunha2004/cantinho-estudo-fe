import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HOME_BY_ROLE } from '../../core/home-by-role';
import { Session } from '../../core/session';
import { UserRole } from '../../model/entity/user.model';
import { Icon, IconName } from '../../shared/icon/icon';

interface RoleOption {
  value: UserRole;
  label: string;
  icon: IconName;
}

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, Icon],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly session = inject(Session);
  private readonly router = inject(Router);

  protected readonly roles: RoleOption[] = [
    { value: 'student', label: 'Aluno', icon: 'graduation-cap' },
    { value: 'professor', label: 'Professor', icon: 'presentation' },
    { value: 'admin', label: 'Admin', icon: 'shield' },
  ];

  protected readonly selectedRole = signal<UserRole>('student');
  protected readonly showPassword = signal(false);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected handleSubmit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    const role = this.selectedRole();

    this.loading.set(true);
    this.errorMessage.set(null);

    this.session.login(email, password, role).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigateByUrl(HOME_BY_ROLE[role]);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(
          error.status === 401
            ? 'E-mail ou senha inválidos.'
            : 'Não foi possível entrar. Tente novamente.',
        );
      },
    });
  }
}

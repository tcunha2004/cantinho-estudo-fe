import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { UserRole } from '../../model/entity/user.model';
import { Session } from '../../core/session';
import { AuthService } from '../../service/auth.service';
import { Card } from '../../shared/card/card';
import { Icon } from '../../shared/icon/icon';
import { PageHeader } from '../../shared/page-header/page-header';

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administrador',
  professor: 'Professor',
  student: 'Aluno',
};

/**
 * Confirmação tem de bater com a nova senha. Valida no grupo porque um campo
 * só não enxerga o outro. Enquanto a confirmação está vazia não acusa erro —
 * quem ainda não digitou não errou.
 */
export function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('newPassword')?.value;
  const confirmation = group.get('confirmPassword')?.value;

  if (!confirmation || password === confirmation) {
    return null;
  }

  return { mismatch: true };
}

@Component({
  selector: 'app-perfil',
  imports: [ReactiveFormsModule, Card, Icon, PageHeader],
  templateUrl: './perfil.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Perfil {
  private readonly fb = inject(FormBuilder);
  private readonly session = inject(Session);
  private readonly authService = inject(AuthService);

  /* Nome, e-mail e papel saem do próprio token — não há requisição a fazer. */
  protected readonly user = this.session.user;
  protected readonly roleLabel = ROLE_LABEL;

  protected readonly showPasswords = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  protected handleSubmit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword } = this.form.getRawValue();

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.authService.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.reset();
        this.successMessage.set('Senha alterada com sucesso.');
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.errorMessage.set(this.messageFor(error));
      },
    });
  }

  /*
   * O 400 é o erro que o usuário resolve (senha atual errada, nova igual à
   * atual) e o backend já manda a frase pronta. O resto é problema nosso.
   */
  private messageFor(error: HttpErrorResponse): string {
    const message = error.status === 400 ? error.error?.message : null;

    return typeof message === 'string'
      ? message
      : 'Não foi possível alterar a senha. Tente novamente.';
  }
}

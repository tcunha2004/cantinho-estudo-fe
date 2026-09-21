import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { UserSummaryDto } from '../../../model/dto/user-summary.dto';
import { UserService } from '../../../service/user.service';
import { Card } from '../../../shared/card/card';
import { Icon } from '../../../shared/icon/icon';
import { PageHeader } from '../../../shared/page-header/page-header';

const MIN_LENGTH = 6;

const ROLE_LABEL: Record<UserSummaryDto['role'], string> = {
  admin: 'Administrador',
  professor: 'Professor',
  student: 'Aluno',
};

/**
 * Acesso dos usuários, para o admin atender quem esqueceu a própria senha.
 *
 * Não há "ver a senha": ela é guardada como hash bcrypt, função de mão única —
 * a senha original não existe em lugar nenhum do sistema e nenhum cálculo a
 * traz de volta. O que resolve o mesmo problema é definir uma nova aqui e
 * repassá-la, e isso funciona para qualquer usuário, inclusive os antigos.
 */
@Component({
  selector: 'app-senhas',
  imports: [Card, Icon, PageHeader],
  templateUrl: './senhas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Senhas {
  private readonly userService = inject(UserService);

  protected readonly roleLabel = ROLE_LABEL;

  protected readonly search = signal('');
  /* Id do usuário com o campo de senha aberto; null = nenhum. */
  protected readonly editingId = signal<string | null>(null);
  protected readonly newPassword = signal('');
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  /* Última senha definida, exibida para o admin repassar. */
  protected readonly lastDefined = signal<{ userId: string; password: string } | null>(null);

  private readonly users = rxResource({
    params: () => ({}),
    stream: () => this.userService.getAll(),
    defaultValue: [] as UserSummaryDto[],
  });

  protected readonly loading = this.users.isLoading;
  protected readonly loadError = this.users.error;

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();

    if (!term) {
      return this.users.value();
    }

    return this.users
      .value()
      .filter(
        (user) =>
          user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term),
      );
  });

  protected readonly subtitle = computed(() => {
    const count = this.filtered().length;
    return count === 1 ? '1 usuário' : `${count} usuários`;
  });

  protected startEditing(user: { id: string }): void {
    this.editingId.set(user.id);
    this.newPassword.set('');
    this.errorMessage.set(null);
    this.lastDefined.set(null);
  }

  protected cancelEditing(): void {
    this.editingId.set(null);
    this.newPassword.set('');
    this.errorMessage.set(null);
  }

  protected confirm(): void {
    const userId = this.editingId();
    const password = this.newPassword();

    if (!userId) {
      return;
    }

    /* Mesmo piso do backend: barrar aqui evita um 400 previsível. */
    if (password.length < MIN_LENGTH) {
      this.errorMessage.set(`A senha deve ter pelo menos ${MIN_LENGTH} caracteres.`);
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    this.userService.setPassword(userId, password).subscribe({
      next: () => {
        this.saving.set(false);
        this.editingId.set(null);
        this.newPassword.set('');
        this.lastDefined.set({ userId, password });
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.errorMessage.set(
          (error.error as { message?: string } | null)?.message ??
            'Não foi possível definir a senha. Tente novamente.',
        );
      },
    });
  }
}

import { Injectable, signal } from '@angular/core';

export type Role = 'admin' | 'professor' | 'student';

/**
 * Guarda o papel do usuário logado. Por enquanto é apenas visual
 * (mock); depois será alimentado pelo login/backend.
 */
@Injectable({ providedIn: 'root' })
export class Session {
  readonly role = signal<Role>('admin');
}

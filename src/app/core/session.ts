import { Injectable, signal } from '@angular/core';

export type Role = 'admin' | 'professor' | 'student';

@Injectable({ providedIn: 'root' })
export class Session {
  readonly role = signal<Role>('admin');
}

import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthService, LoginResponse } from '../service/auth.service';
import { Role, Session } from './session';

const TOKEN_KEY = 'access_token';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly authService = inject(AuthService);
  private readonly session = inject(Session);

  readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  login(email: string, password: string, role: Role): Observable<LoginResponse> {
    return this.authService.login({ email, password, role }).pipe(
      tap(({ access_token }) => {
        localStorage.setItem(TOKEN_KEY, access_token);
        this.token.set(access_token);
        this.session.role.set(role);
      }),
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.token.set(null);
  }
}

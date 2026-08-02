import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { UserRole } from '../model/entity/user.model';
import { AuthService, LoginResponse } from '../service/auth.service';

const TOKEN_KEY = 'access_token';

/** Claims assinadas pelo backend em `AuthService.signToken`. */
interface TokenPayload {
  sub: string;
  name: string;
  email: string;
  role: UserRole;
  exp: number;
}

/** Lê o payload do JWT. Devolve `null` se o token for malformado ou já expirado. */
function decodeToken(token: string | null): TokenPayload | null {
  if (!token) {
    return null;
  }

  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = new TextDecoder().decode(
      Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)),
    );
    const payload = JSON.parse(json) as TokenPayload;

    return payload.exp * 1000 > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

/** Restaura o token salvo, descartando-o caso não seja mais utilizável. */
function readStoredToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);

  if (token && !decodeToken(token)) {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }

  return token;
}

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly authService = inject(AuthService);
  private readonly tokenSignal = signal<string | null>(readStoredToken());

  readonly token = this.tokenSignal.asReadonly();

  /** Sessão derivada do próprio token — sobrevive a refresh e não pode ser forjada na UI. */
  readonly user = computed(() => decodeToken(this.tokenSignal()));
  readonly role = computed(() => this.user()?.role ?? null);
  readonly isLoggedIn = computed(() => this.user() !== null);

  login(email: string, password: string, role: UserRole): Observable<LoginResponse> {
    return this.authService.login({ email, password, role }).pipe(
      tap(({ access_token }) => {
        localStorage.setItem(TOKEN_KEY, access_token);
        this.tokenSignal.set(access_token);
      }),
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.tokenSignal.set(null);
  }
}

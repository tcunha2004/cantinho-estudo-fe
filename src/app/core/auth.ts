import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Role, Session } from './session';

interface LoginRequest {
  email: string;
  password: string;
  role: Role;
}

interface LoginResponse {
  access_token: string;
}

const TOKEN_KEY = 'access_token';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly session = inject(Session);

  private readonly baseUrl = 'http://localhost:3000';

  readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  login(email: string, password: string, role: Role): Observable<LoginResponse> {
    const body: LoginRequest = { email, password, role };

    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, body).pipe(
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

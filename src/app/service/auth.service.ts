import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UserRole } from '../model/entity/user.model';
import { ApiClient } from './api-client';

export interface LoginRequest {
  email: string;
  password: string;
  role: UserRole;
}

export interface LoginResponse {
  access_token: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClient);

  login(body: LoginRequest): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('/auth/login', body);
  }

  /* Quem troca a senha é sempre o dono do token — o backend não aceita id. */
  changePassword(body: ChangePasswordRequest): Observable<void> {
    return this.api.patch<void>('/auth/password', body);
  }
}

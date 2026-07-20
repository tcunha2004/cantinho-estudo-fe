import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Role } from '../core/session';
import { API_BASE_URL } from './api.config';

export interface LoginRequest {
  email: string;
  password: string;
  role: Role;
}

export interface LoginResponse {
  access_token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = API_BASE_URL;

  login(body: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, body);
  }
}

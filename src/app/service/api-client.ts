import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

/** Query string de uma requisição. */
export type QueryParams = Record<string, string | number | boolean>;

/**
 * Porta de entrada única para a API: resolve a URL base e desembrulha respostas
 * de campo único. Os serviços de domínio dependem dele, não do `HttpClient`,
 * então trocar a forma de falar com o backend acontece só aqui.
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);

  get<T>(path: string, params?: QueryParams): Observable<T> {
    return this.http.get<T>(API_BASE_URL + path, { params });
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(API_BASE_URL + path, body);
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(API_BASE_URL + path, body);
  }

  /** GET cuja resposta é um objeto de um campo só, ex.: `{ count: 12 }` devolve `12`. */
  getField<T>(path: string, field: string, params?: QueryParams): Observable<T> {
    return this.get<Record<string, T>>(path, params).pipe(map((response) => response[field]));
  }
}

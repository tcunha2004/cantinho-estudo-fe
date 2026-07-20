import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from './api.config';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class StudentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = API_BASE_URL;

  getActiveStudentsCount(): Observable<number> {
    return this.http
      .get<{ count: number }>(`${this.baseUrl}/students/active/count`)
      .pipe(map((response) => response.count));
  }
}

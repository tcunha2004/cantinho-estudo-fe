import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from './api.config';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ClassService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = API_BASE_URL;

  getCurrentWeekClassesCount(): Observable<number> {
    return this.http
      .get<{ count: number }>(`${this.baseUrl}/classes/current-week/count`)
      .pipe(map((response) => response.count));
  }

  getCurrentMonthRevenue(): Observable<number> {
    return this.http
      .get<{ revenue: number }>(`${this.baseUrl}/classes/current-month/revenue`)
      .pipe(map((response) => response.revenue));
  }
}

import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from './api.config';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Class } from '../model/entity/class.model';

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

  getUpcomingClassesToday(): Observable<Class[]> {
    return this.http.get<Class[]>(`${this.baseUrl}/classes/today/upcoming`);
  }

  getTeacherUpcomingClasses(): Observable<Class[]> {
    return this.http.get<Class[]>(`${this.baseUrl}/classes/teacher/upcoming`);
  }

  getTeacherRecentClasses(): Observable<Class[]> {
    return this.http.get<Class[]>(`${this.baseUrl}/classes/teacher/recent-history`);
  }

  /* Mês de referência no formato YYYY-MM (ex.: 2026-07) */
  private getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  getTeacherMonthlyClassesCount(month: string = this.getCurrentMonth()): Observable<number> {
    return this.http
      .get<{ count: number }>(`${this.baseUrl}/classes/teacher/monthly-count`, {
        params: new HttpParams().set('month', month),
      })
      .pipe(map((response) => response.count));
  }

  getTeacherMonthlyEarnings(month: string = this.getCurrentMonth()): Observable<number> {
    return this.http
      .get<{ amountToReceive: number }>(`${this.baseUrl}/classes/teacher/monthly-earnings`, {
        params: new HttpParams().set('month', month),
      })
      .pipe(map((response) => response.amountToReceive));
  }

  getTeacherMonthlyClassesCountByWeek(
    month: string = this.getCurrentMonth(),
  ): Observable<{ week: number; count: number | null }[]> {
    return this.http.get<{ week: number; count: number | null }[]>(
      `${this.baseUrl}/classes/teacher/weekly-count`,
      {
        params: new HttpParams().set('month', month),
      },
    );
  }
}

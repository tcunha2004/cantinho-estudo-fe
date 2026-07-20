import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from './api.config';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TeacherService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = API_BASE_URL;

  private getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  getAllTeachersEarningsByMonth(): Observable<number> {
    const targetMonth = this.getCurrentMonth();
    return this.http
      .get<{ totalAmountToReceive: number }>(
        `${this.baseUrl}/teachers/all/monthly-earnings?month=${targetMonth}`,
      )
      .pipe(map((response) => response.totalAmountToReceive));
  }
}

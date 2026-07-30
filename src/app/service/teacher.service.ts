import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from './api.config';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TeachersEarningsSummaryDto } from '../model/dto/teachers-earnings-summary.dto';

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

  getAllTeachersEarningsByMonth(): Observable<TeachersEarningsSummaryDto> {
    const targetMonth = this.getCurrentMonth();
    return this.http.get<TeachersEarningsSummaryDto>(
      `${this.baseUrl}/teachers/all/monthly-earnings?month=${targetMonth}`,
    );
  }
}

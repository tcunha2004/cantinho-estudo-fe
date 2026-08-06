import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { WeeklyClassesCountDto } from '../model/dto/weekly-classes-count.dto';
import { Class } from '../model/entity/class.model';
import { currentMonth } from '../shared/month';
import { ApiClient } from './api-client';

@Injectable({ providedIn: 'root' })
export class ClassService {
  private readonly api = inject(ApiClient);

  getCurrentWeekCount(): Observable<number> {
    return this.api.getField<number>('/classes/current-week/count', 'count');
  }

  getCurrentMonthRevenue(): Observable<number> {
    return this.api.getField<number>('/classes/current-month/revenue', 'revenue');
  }

  getUpcomingToday(): Observable<Class[]> {
    return this.api.get<Class[]>('/classes/today/upcoming');
  }

  getTeacherUpcoming(): Observable<Class[]> {
    return this.api.get<Class[]>('/classes/teacher/upcoming');
  }

  getTeacherRecent(): Observable<Class[]> {
    return this.api.get<Class[]>('/classes/teacher/recent-history');
  }

  getTeacherMonthlyCount(month = currentMonth()): Observable<number> {
    return this.api.getField<number>('/classes/teacher/monthly-count', 'count', { month });
  }

  getTeacherMonthlyEarnings(month = currentMonth()): Observable<number> {
    return this.api.getField<number>('/classes/teacher/monthly-earnings', 'amountToReceive', {
      month,
    });
  }

  getTeacherWeeklyCounts(month = currentMonth()): Observable<WeeklyClassesCountDto[]> {
    return this.api.get<WeeklyClassesCountDto[]>('/classes/teacher/weekly-count', { month });
  }
}

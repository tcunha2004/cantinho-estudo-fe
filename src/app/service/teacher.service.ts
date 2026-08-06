import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TeachersEarningsSummaryDto } from '../model/dto/teachers-earnings-summary.dto';
import { currentMonth } from '../shared/month';
import { ApiClient } from './api-client';

@Injectable({ providedIn: 'root' })
export class TeacherService {
  private readonly api = inject(ApiClient);

  getEarningsByMonth(month = currentMonth()): Observable<TeachersEarningsSummaryDto> {
    return this.api.get<TeachersEarningsSummaryDto>('/teachers/all/monthly-earnings', { month });
  }
}

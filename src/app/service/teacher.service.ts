import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TeachersEarningsSummaryDto } from '../model/dto/teachers-earnings-summary.dto';
import { TeacherDetailDto } from '../model/dto/teacher-detail.dto';
import { currentMonth } from '../shared/month';
import { ApiClient } from './api-client';

/* Corpo de edição do professor pelo admin. Todos os campos opcionais — só o
 * que vier é alterado; `subjectIds`, quando enviado, substitui a lista. */
export interface UpdateTeacherPayload {
  name?: string;
  email?: string;
  bio?: string | null;
  subjectIds?: string[];
  active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class TeacherService {
  private readonly api = inject(ApiClient);

  getActiveCount(): Observable<number> {
    return this.api.getField<number>('/teachers/active/count', 'count');
  }

  getEarningsByMonth(month = currentMonth()): Observable<TeachersEarningsSummaryDto> {
    return this.api.get<TeachersEarningsSummaryDto>('/teachers/all/monthly-earnings', { month });
  }

  getById(id: string): Observable<TeacherDetailDto> {
    return this.api.get<TeacherDetailDto>(`/teachers/${id}`);
  }

  update(id: string, payload: UpdateTeacherPayload): Observable<TeacherDetailDto> {
    return this.api.patch<TeacherDetailDto>(`/teachers/${id}`, payload);
  }
}

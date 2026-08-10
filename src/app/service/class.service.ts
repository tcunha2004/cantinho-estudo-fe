import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AgendaClassDto, ClassDetailDto } from '../model/dto/agenda-class.dto';
import { ClassFormOptionsDto } from '../model/dto/class-form-options.dto';
import { WeeklyClassesCountDto } from '../model/dto/weekly-classes-count.dto';
import { Class, LocationType } from '../model/entity/class.model';
import { currentMonth } from '../shared/month';
import { ApiClient, QueryParams } from './api-client';

/* Corpo de criação/edição de aula. `scheduledAt` vai como hora local sem fuso
 * ('2026-08-10T14:30:00'), casando com o que o backend grava. */
export interface ClassPayload {
  studentId: string;
  teacherId?: string;
  subjectId: string;
  scheduledAt: string;
  durationMinutes: number;
  locationType: LocationType;
  notes?: string;
}

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

  /* Aulas da agenda num intervalo de dias (from/to no formato YYYY-MM-DD).
   * O backend escopa pelo papel de quem pediu; os filtros só valem para admin. */
  getAgenda(params: QueryParams): Observable<AgendaClassDto[]> {
    return this.api.get<AgendaClassDto[]>('/classes/agenda', params);
  }

  getFormOptions(): Observable<ClassFormOptionsDto> {
    return this.api.get<ClassFormOptionsDto>('/classes/form-options');
  }

  getById(id: string): Observable<ClassDetailDto> {
    return this.api.get<ClassDetailDto>(`/classes/${id}`);
  }

  create(payload: ClassPayload): Observable<ClassDetailDto> {
    return this.api.post<ClassDetailDto>('/classes', payload);
  }

  update(id: string, payload: ClassPayload): Observable<ClassDetailDto> {
    return this.api.patch<ClassDetailDto>(`/classes/${id}`, payload);
  }

  cancel(id: string): Observable<ClassDetailDto> {
    return this.api.patch<ClassDetailDto>(`/classes/${id}/cancel`, {});
  }

  /* Encerra a aula: o backend congela região, comissão e valor cobrado. */
  complete(id: string): Observable<ClassDetailDto> {
    return this.api.patch<ClassDetailDto>(`/classes/${id}/complete`, {});
  }

  markNoShow(id: string): Observable<ClassDetailDto> {
    return this.api.patch<ClassDetailDto>(`/classes/${id}/no-show`, {});
  }

  /* Desfaz o encerramento e descongela os valores. Só admin. */
  reopen(id: string): Observable<ClassDetailDto> {
    return this.api.patch<ClassDetailDto>(`/classes/${id}/reopen`, {});
  }
}

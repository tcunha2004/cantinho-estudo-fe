import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from './api.config';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { ActiveStudentDto } from '../model/dto/active-student.dto';
import { StudentPlanDto } from '../model/dto/student-plan.dto';
import { PlanSummaryDto } from '../model/dto/plan-summary.dto';
import { PaymentHistoryDto } from '../model/dto/payment-history.dto';

@Injectable({ providedIn: 'root' })
export class StudentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = API_BASE_URL;

  getActiveStudentsCount(): Observable<number> {
    return this.http
      .get<{ count: number }>(`${this.baseUrl}/students/active/count`)
      .pipe(map((response) => response.count));
  }

  getActiveStudents(): Observable<ActiveStudentDto[]> {
    return this.http.get<ActiveStudentDto[]>(`${this.baseUrl}/students/active`);
  }

  getStudentPlan(): Observable<StudentPlanDto> {
    return this.http.get<StudentPlanDto>(`${this.baseUrl}/students/me/plan`);
  }

  getOtherPlans(): Observable<PlanSummaryDto[]> {
    return this.http.get<PlanSummaryDto[]>(`${this.baseUrl}/students/me/other-plans`);
  }

  getStudentPaymentHistory(): Observable<PaymentHistoryDto[]> {
    return this.http.get<PaymentHistoryDto[]>(`${this.baseUrl}/students/me/payments`);
  }
}

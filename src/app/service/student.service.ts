import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ActiveStudentDto } from '../model/dto/active-student.dto';
import { PaymentHistoryDto } from '../model/dto/payment-history.dto';
import { StudentPlanDto } from '../model/dto/student-plan.dto';
import { ApiClient } from './api-client';

@Injectable({ providedIn: 'root' })
export class StudentService {
  private readonly api = inject(ApiClient);

  getActive(): Observable<ActiveStudentDto[]> {
    return this.api.get<ActiveStudentDto[]>('/students/active');
  }

  getActiveCount(): Observable<number> {
    return this.api.getField<number>('/students/active/count', 'count');
  }

  getMyPlan(): Observable<StudentPlanDto> {
    return this.api.get<StudentPlanDto>('/students/me/plan');
  }

  getMyPayments(): Observable<PaymentHistoryDto[]> {
    return this.api.get<PaymentHistoryDto[]>('/students/me/payments');
  }
}

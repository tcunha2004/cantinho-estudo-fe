import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from './api.config';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Class } from '../model/class.model';
import { PlanType } from '../model/plan.model';

@Injectable({ providedIn: 'root' })
export class StudentContractService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = API_BASE_URL;

  getCountOfActiveStudentsByPlanType(): Observable<Record<PlanType, number>> {
    return this.http.get<Record<PlanType, number>>(
      `${this.baseUrl}/student-contracts/active/count-by-plan-type`,
    );
  }
}

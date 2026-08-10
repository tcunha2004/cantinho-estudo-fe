import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PlanType } from '../model/entity/plan.model';
import { ApiClient } from './api-client';

@Injectable({ providedIn: 'root' })
export class StudentContractService {
  private readonly api = inject(ApiClient);

  getActiveCountByPlanType(): Observable<Record<PlanType, number>> {
    return this.api.get<Record<PlanType, number>>('/student-contracts/active/count-by-plan-type');
  }
}

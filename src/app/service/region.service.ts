import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RegionPricingDto } from '../model/dto/region-pricing.dto';
import { PlanPricingDto } from '../model/dto/plan-pricing.dto';
import { ApiClient } from './api-client';

/* Campos de plano que o reajuste anual altera. Decimais vão como string, que é
 * como o backend os guarda. */
export interface UpdatePlanPayload {
  monthlyPrice?: string;
  hourPrice?: string;
  classesCount?: number | null;
  validityMonths?: number | null;
}

/* Taxas da região, ajustadas no mesmo reajuste. */
export interface UpdateRegionPayload {
  enrollmentFee?: string;
  classCommission?: string;
}

@Injectable({ providedIn: 'root' })
export class RegionService {
  private readonly api = inject(ApiClient);

  getPricing(): Observable<RegionPricingDto[]> {
    return this.api.get<RegionPricingDto[]>('/regions/pricing');
  }

  updatePlan(id: string, payload: UpdatePlanPayload): Observable<PlanPricingDto> {
    return this.api.patch<PlanPricingDto>(`/plans/${id}`, payload);
  }

  updateRegion(id: string, payload: UpdateRegionPayload): Observable<RegionPricingDto> {
    return this.api.patch<RegionPricingDto>(`/regions/${id}`, payload);
  }
}

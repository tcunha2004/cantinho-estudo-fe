import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RegionPricingDto } from '../model/dto/region-pricing.dto';
import { ApiClient } from './api-client';

@Injectable({ providedIn: 'root' })
export class RegionService {
  private readonly api = inject(ApiClient);

  getPricing(): Observable<RegionPricingDto[]> {
    return this.api.get<RegionPricingDto[]>('/regions/pricing');
  }
}

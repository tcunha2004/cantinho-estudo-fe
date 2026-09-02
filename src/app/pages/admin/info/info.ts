import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { PlanType } from '../../../model/entity/plan.model';
import { RegionService } from '../../../service/region.service';
import { Card } from '../../../shared/card/card';
import { Icon } from '../../../shared/icon/icon';
import { PageHeader } from '../../../shared/page-header/page-header';
import { downloadPdf as printPdf } from '../../../shared/print-pdf';

@Component({
  selector: 'app-info',
  imports: [Card, CurrencyPipe, Icon, PageHeader],
  templateUrl: './info.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Info {
  private readonly document = inject(DOCUMENT);
  private readonly regionService = inject(RegionService);

  protected readonly regions = toSignal(this.regionService.getPricing(), {
    initialValue: [],
  });

  private readonly selectedSlug = signal<string | null>(null);

  protected readonly region = computed(() => {
    const regions = this.regions();
    if (regions.length === 0) {
      return null;
    }

    const slug = this.selectedSlug();
    return regions.find((item) => item.slug === slug) ?? regions[0];
  });

  protected readonly ouroPlans = computed(() =>
    [...(this.region()?.plans ?? [])]
      .filter((plan) => plan.planType === 'ouro')
      .sort((a, b) => (a.frequency ?? 0) - (b.frequency ?? 0)),
  );

  protected readonly prataPlan = computed(() => this.findPlan('prata'));
  protected readonly bronzePlan = computed(() => this.findPlan('bronze'));
  protected readonly avulsaPlan = computed(() => this.findPlan('avulsa'));

  private findPlan(planType: PlanType) {
    return this.region()?.plans.find((plan) => plan.planType === planType) ?? null;
  }

  protected selectRegion(slug: string): void {
    this.selectedSlug.set(slug);
  }

  protected downloadPdf(): void {
    const region = this.region();
    if (!region) {
      return;
    }

    printPdf(this.document, `Planos ${region.name} - Cantinho do Estudo`);
  }
}

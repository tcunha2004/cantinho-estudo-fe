import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { RegionService } from '../../../service/region.service';
import { Modal } from '../../../shared/modal/modal';

/** Comissão por hora de aula (`regions.class_commission`) de cada região. */
@Component({
  selector: 'app-commission-info-modal',
  imports: [CurrencyPipe, Modal],
  templateUrl: './commission-info-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommissionInfoModal {
  readonly closed = output<void>();

  private readonly regionService = inject(RegionService);

  protected readonly regions = toSignal(this.regionService.getPricing(), { initialValue: [] });
}

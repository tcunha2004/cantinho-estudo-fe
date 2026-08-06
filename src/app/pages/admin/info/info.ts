import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  inject,
  signal,
} from '@angular/core';
import { Card } from '../../../shared/card/card';
import { Icon } from '../../../shared/icon/icon';
import { PageHeader } from '../../../shared/page-header/page-header';
import { REGION_PRICING } from './region-pricing';

@Component({
  selector: 'app-info',
  imports: [Card, Icon, PageHeader],
  templateUrl: './info.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Info {
  private readonly document = inject(DOCUMENT);

  protected readonly regions = REGION_PRICING;
  protected readonly selectedSlug = signal(this.regions[0].slug);

  protected readonly region = computed(
    () => this.regions.find((region) => region.slug === this.selectedSlug()) ?? this.regions[0],
  );

  /**
   * Gera o PDF da região selecionada pela impressão do navegador ("Salvar como PDF"),
   * que preserva o layout da tela. O título do documento vira o nome do arquivo
   * sugerido, então é trocado durante a impressão e restaurado depois.
   */
  protected downloadPdf(): void {
    const win = this.document.defaultView;
    const previousTitle = this.document.title;

    this.document.title = `Planos ${this.region().name} - Cantinho do Estudo`;

    const restoreTitle = () => {
      this.document.title = previousTitle;
      win?.removeEventListener('afterprint', restoreTitle);
    };

    win?.addEventListener('afterprint', restoreTitle);
    win?.print();
  }
}

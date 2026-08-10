import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Cabeçalho padrão das páginas: título, subtítulo opcional e um espaço à
 * direita para ações (busca, filtros, botões) via projeção de conteúdo.
 */
@Component({
  selector: 'app-page-header',
  host: { class: 'flex flex-wrap items-end justify-between gap-4' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <h1 class="font-display text-3xl font-bold">{{ title() }}</h1>
      @if (subtitle()) {
        <p class="mt-1 text-ink-soft">{{ subtitle() }}</p>
      }
    </div>
    <ng-content />
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}

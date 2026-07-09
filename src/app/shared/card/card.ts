import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Card branco padrão do sistema: bordas suaves, sombra leve e borda bege.
 * Não define tamanho — ocupa o espaço que o container der (grid/flex).
 */
@Component({
  selector: 'app-card',
  host: { class: 'block rounded-3xl border border-line bg-white p-6 shadow-xs' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
})
export class Card {}

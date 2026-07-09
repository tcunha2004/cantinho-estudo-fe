import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/** Página provisória exibida nas rotas cujo conteúdo ainda não foi desenhado. */
@Component({
  selector: 'app-placeholder',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="font-display text-3xl font-bold">{{ title }}</h1>
    <section class="mt-6 rounded-2xl border border-line bg-white p-12 text-center shadow-sm">
      <p class="font-display text-lg font-bold">Em construção</p>
      <p class="mt-1 text-sm text-ink-soft">Esta tela ainda será desenhada.</p>
    </section>
  `,
})
export class Placeholder {
  protected readonly title: string =
    inject(ActivatedRoute).snapshot.data['title'] ?? '';
}

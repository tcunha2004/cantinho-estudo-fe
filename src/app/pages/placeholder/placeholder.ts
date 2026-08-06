import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PageHeader } from '../../shared/page-header/page-header';

/** Página provisória exibida nas rotas cujo conteúdo ainda não foi desenhado. */
@Component({
  selector: 'app-placeholder',
  imports: [PageHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="title" />
    <section class="mt-6 rounded-2xl border border-line bg-white p-12 text-center shadow-sm">
      <p class="font-display text-lg font-bold">Em construção</p>
      <p class="mt-1 text-sm text-ink-soft">Esta tela ainda será desenhada.</p>
    </section>
  `,
})
export class Placeholder {
  protected readonly title: string = inject(ActivatedRoute).snapshot.data['title'] ?? '';
}

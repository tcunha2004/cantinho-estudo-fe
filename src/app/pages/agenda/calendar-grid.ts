import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { AgendaClassDto } from '../../model/dto/agenda-class.dto';
import { UserRole } from '../../model/entity/user.model';
import { CLASS_STATUS_DISPLAY } from '../../shared/domain-display';
import { DayColumn, HOUR_HEIGHT, HOUR_LABELS, isSameDay, offsetOf } from './agenda-layout';

/* Hora em que a grade abre — ninguém quer começar olhando a madrugada. */
const INITIAL_SCROLL_HOUR = 7;

/**
 * Grade de horários da agenda: régua de 00:00 a 23:59 à esquerda e uma coluna
 * por dia. O mesmo template serve o modo dia (uma coluna) e o de semana (sete);
 * só o número de colunas muda.
 *
 * Componente burro: recebe os dias já posicionados por `agenda-layout.ts` e
 * apenas avisa quando alguém clica numa aula.
 */
@Component({
  selector: 'app-calendar-grid',
  imports: [DatePipe],
  templateUrl: './calendar-grid.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarGrid {
  readonly days = input.required<DayColumn[]>();
  readonly role = input<UserRole | null>(null);
  readonly selected = output<AgendaClassDto>();

  protected readonly hourHeight = HOUR_HEIGHT;
  protected readonly hourLabels = HOUR_LABELS;
  protected readonly classStatus = CLASS_STATUS_DISPLAY;

  private readonly scroller = viewChild.required<ElementRef<HTMLElement>>('scroller');

  /* A régua ocupa uma faixa fixa; os dias dividem o resto por igual. */
  protected readonly columnsTemplate = computed(
    () => `4rem repeat(${this.days().length}, minmax(0, 1fr))`,
  );

  private readonly today = new Date();

  /* Posição da linha de "agora", calculada uma vez — sem timer para manter a
   * página barata; quem deixa a agenda aberta por horas recarrega. */
  protected readonly nowOffset = offsetOf(this.today.getHours() * 60 + this.today.getMinutes());

  constructor() {
    afterNextRender(() => {
      this.scroller().nativeElement.scrollTop = INITIAL_SCROLL_HOUR * HOUR_HEIGHT;
    });
  }

  protected isToday(date: Date): boolean {
    return isSameDay(date, this.today);
  }
}

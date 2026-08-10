import { AgendaClassDto } from '../../model/dto/agenda-class.dto';

/*
 * Contas da grade da agenda. Tudo aqui é função pura, sem Angular e sem
 * `Date.now()` escondido — é o que torna o posicionamento e a sobreposição
 * testáveis sem montar componente.
 */

export type ViewMode = 'day' | 'week';

/* Altura de uma hora na grade, em px. Régua, linhas de fundo e cards saem
 * todos daqui, então nada desalinha. */
export const HOUR_HEIGHT = 64;

const MINUTES_IN_DAY = 24 * 60;
const DAY_HEIGHT = 24 * HOUR_HEIGHT;

/* Altura mínima para o card continuar legível (uma aula de 15 min daria 16px). */
const MIN_CARD_HEIGHT = 22;

/* Respiro entre dois cards lado a lado, em px. */
const CARD_GAP = 3;

/* Rótulos da régua: '00:00' … '23:00'. */
export const HOUR_LABELS = Array.from(
  { length: 24 },
  (_, hour) => `${String(hour).padStart(2, '0')}:00`,
);

export interface PositionedEvent {
  event: AgendaClassDto;
  top: number;
  height: number;
  /* Percentuais/`calc` prontos: o template só amarra em [style.left]/[style.width]. */
  left: string;
  width: string;
}

export interface DayColumn {
  date: Date;
  /* 'YYYY-MM-DD' — chave estável para o `track` do @for */
  key: string;
  events: PositionedEvent[];
}

export interface AgendaRange {
  from: string;
  to: string;
  days: Date[];
}

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/* Domingo, para casar com a semana que o backend já usa nos relatórios. */
export function startOfWeek(date: Date): Date {
  return addDays(startOfDay(date), -date.getDay());
}

export function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

/* Data local a partir de um horário ingênuo — só a parte da data importa, e
 * montá-la por partes evita qualquer interpretação de fuso. */
export function dayOf(naiveDateTime: string): Date {
  const [year, month, day] = naiveDateTime.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

/* Dias visíveis e os limites que vão como `from`/`to` para a API. */
export function visibleRange(anchor: Date, mode: ViewMode): AgendaRange {
  const first = mode === 'day' ? startOfDay(anchor) : startOfWeek(anchor);
  const days = Array.from({ length: mode === 'day' ? 1 : 7 }, (_, index) => addDays(first, index));

  return { from: toDateKey(first), to: toDateKey(days[days.length - 1]), days };
}

/*
 * Minuto do dia a partir do horário ingênuo ('2026-08-10T14:30:00'). Lido da
 * própria string: passar por `new Date` só abriria espaço para deslocamento de
 * fuso onde não existe fuso nenhum.
 */
export function minutesOfDay(naiveDateTime: string): number {
  const hours = Number(naiveDateTime.slice(11, 13));
  const minutes = Number(naiveDateTime.slice(14, 16));
  return hours * 60 + minutes;
}

/* Distância do topo da grade até um minuto do dia. */
export function offsetOf(minutes: number): number {
  return (minutes / 60) * HOUR_HEIGHT;
}

/*
 * Posiciona as aulas de um dia. Aulas que se sobrepõem viram colunas lado a
 * lado: agrupa em blocos que se tocam e, dentro de cada bloco, encaixa cada
 * aula na primeira coluna já livre — abrindo uma nova só quando não há.
 */
export function layoutDay(events: AgendaClassDto[]): PositionedEvent[] {
  const items = events
    .map((event) => {
      const start = minutesOfDay(event.scheduledAt);
      return {
        event,
        start,
        end: Math.min(start + event.durationMinutes, MINUTES_IN_DAY),
      };
    })
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const positioned: PositionedEvent[] = [];
  let cluster: typeof items = [];
  let clusterEnd = -1;

  const flushCluster = (): void => {
    if (cluster.length === 0) {
      return;
    }

    const columnEnds: number[] = [];
    const columnOf = cluster.map((item) => {
      const free = columnEnds.findIndex((end) => end <= item.start);
      const column = free === -1 ? columnEnds.length : free;
      columnEnds[column] = item.end;
      return column;
    });

    const columns = columnEnds.length;

    cluster.forEach((item, index) => {
      const top = offsetOf(item.start);
      const rawHeight = offsetOf(item.end - item.start);

      positioned.push({
        event: item.event,
        top,
        height: Math.min(Math.max(rawHeight, MIN_CARD_HEIGHT), DAY_HEIGHT - top),
        left: `${(columnOf[index] / columns) * 100}%`,
        width: `calc(${100 / columns}% - ${CARD_GAP}px)`,
      });
    });
  };

  for (const item of items) {
    if (item.start >= clusterEnd) {
      flushCluster();
      cluster = [];
    }

    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.end);
  }

  flushCluster();

  return positioned;
}

/* Distribui as aulas nas colunas de dia da grade, já posicionadas. */
export function buildDays(days: Date[], events: AgendaClassDto[]): DayColumn[] {
  const byDay = new Map<string, AgendaClassDto[]>();

  for (const event of events) {
    const key = event.scheduledAt.slice(0, 10);
    const bucket = byDay.get(key);

    if (bucket) {
      bucket.push(event);
    } else {
      byDay.set(key, [event]);
    }
  }

  return days.map((date) => {
    const key = toDateKey(date);
    return { date, key, events: layoutDay(byDay.get(key) ?? []) };
  });
}

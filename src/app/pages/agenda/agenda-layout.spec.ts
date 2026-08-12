import { AgendaClassDto } from '../../model/dto/agenda-class.dto';
import {
  buildDays,
  HOUR_HEIGHT,
  layoutDay,
  minutesOfDay,
  startOfWeek,
  toDateKey,
  visibleRange,
} from './agenda-layout';

function makeClass(scheduledAt: string, durationMinutes = 60, id = scheduledAt): AgendaClassDto {
  return {
    id,
    scheduledAt,
    endsAt: scheduledAt,
    durationMinutes,
    status: 'scheduled',
    locationType: 'school',
    subject: { id: 's', name: 'Matemática' },
    teacher: { id: 't', name: 'Renata Lima' },
    student: { id: 'a', name: 'João Silva' },
  };
}

describe('minutesOfDay', () => {
  it('lê a hora da string, sem passar por Date', () => {
    expect(minutesOfDay('2026-08-10T00:00:00')).toBe(0);
    expect(minutesOfDay('2026-08-10T14:30:00')).toBe(870);
    expect(minutesOfDay('2026-08-10T23:59:00')).toBe(1439);
  });
});

describe('visibleRange', () => {
  it('no modo dia devolve um único dia', () => {
    const range = visibleRange(new Date(2026, 7, 12), 'day');

    expect(range.from).toBe('2026-08-12');
    expect(range.to).toBe('2026-08-12');
    expect(range.days).toHaveLength(1);
  });

  it('no modo semana vai de domingo a sábado', () => {
    // 2026-08-12 é uma quarta-feira
    const range = visibleRange(new Date(2026, 7, 12), 'week');

    expect(range.from).toBe('2026-08-09');
    expect(range.to).toBe('2026-08-15');
    expect(range.days).toHaveLength(7);
  });

  it('mantém a semana quando a âncora já é domingo', () => {
    expect(toDateKey(startOfWeek(new Date(2026, 7, 9)))).toBe('2026-08-09');
  });
});

describe('layoutDay', () => {
  it('posiciona pelo horário e dimensiona pela duração', () => {
    const [card] = layoutDay([makeClass('2026-08-10T09:30:00', 90)]);

    expect(card.top).toBe(9.5 * HOUR_HEIGHT);
    expect(card.height).toBe(1.5 * HOUR_HEIGHT);
    expect(card.left).toBe('0%');
  });

  it('nunca deixa o card passar da meia-noite', () => {
    const [card] = layoutDay([makeClass('2026-08-10T23:00:00', 180)]);

    expect(card.top + card.height).toBe(24 * HOUR_HEIGHT);
  });

  it('garante altura mínima para aulas curtas', () => {
    const [card] = layoutDay([makeClass('2026-08-10T09:00:00', 15)]);

    expect(card.height).toBeGreaterThanOrEqual(22);
  });

  it('mantém aulas sem sobreposição em largura cheia', () => {
    const cards = layoutDay([
      makeClass('2026-08-10T08:00:00', 60),
      makeClass('2026-08-10T09:00:00', 60),
    ]);

    expect(cards.map((card) => card.left)).toEqual(['0%', '0%']);
    expect(cards.every((card) => card.width === 'calc(100% - 3px)')).toBe(true);
  });

  it('divide duas aulas sobrepostas em duas colunas', () => {
    const cards = layoutDay([
      makeClass('2026-08-10T08:00:00', 60),
      makeClass('2026-08-10T08:30:00', 60),
    ]);

    expect(cards.map((card) => card.left)).toEqual(['0%', '50%']);
    expect(cards.every((card) => card.width === 'calc(50% - 3px)')).toBe(true);
  });

  it('divide três aulas sobrepostas em três colunas', () => {
    const cards = layoutDay([
      makeClass('2026-08-10T08:00:00', 120),
      makeClass('2026-08-10T08:30:00', 60),
      makeClass('2026-08-10T09:00:00', 60),
    ]);

    expect(cards).toHaveLength(3);
    expect(new Set(cards.map((card) => card.left)).size).toBe(3);
    expect(cards.every((card) => card.width.startsWith('calc(33.'))).toBe(true);
  });

  it('reaproveita a coluna quando o horário já foi liberado', () => {
    // A 3ª aula começa depois do fim da 1ª, então volta para a coluna 0.
    const cards = layoutDay([
      makeClass('2026-08-10T08:00:00', 60),
      makeClass('2026-08-10T08:30:00', 120),
      makeClass('2026-08-10T09:00:00', 60),
    ]);

    expect(cards.map((card) => card.left)).toEqual(['0%', '50%', '0%']);
  });
});

describe('buildDays', () => {
  it('joga cada aula na coluna do seu dia', () => {
    const days = visibleRange(new Date(2026, 7, 12), 'week').days;

    const columns = buildDays(days, [
      makeClass('2026-08-09T10:00:00'),
      makeClass('2026-08-12T10:00:00'),
      makeClass('2026-08-12T14:00:00'),
    ]);

    expect(columns.map((column) => column.events.length)).toEqual([1, 0, 0, 3 - 1, 0, 0, 0]);
    expect(columns[0].key).toBe('2026-08-09');
  });

  it('devolve colunas vazias quando não há aulas', () => {
    const days = visibleRange(new Date(2026, 7, 12), 'day').days;

    expect(buildDays(days, [])).toEqual([{ date: days[0], key: '2026-08-12', events: [] }]);
  });
});

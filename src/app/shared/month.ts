/** Mês corrente no formato que a API espera: `YYYY-MM` (ex.: `2026-08`). */
export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Primeiro e último dia do mês `YYYY-MM` — o intervalo que a agenda espera. */
export function monthRange(month = currentMonth()): { from: string; to: string } {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();

  return { from: `${month}-01`, to: `${month}-${lastDay}` };
}

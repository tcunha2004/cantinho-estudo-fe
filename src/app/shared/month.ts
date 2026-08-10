/** Mês corrente no formato que a API espera: `YYYY-MM` (ex.: `2026-08`). */
export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

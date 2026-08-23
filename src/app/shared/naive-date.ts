/*
 * O backend guarda e devolve hora de parede ingênua de São Paulo
 * ('2026-08-10T14:30:00', sem sufixo de fuso). O navegador do usuário já está
 * em São Paulo, então os getters locais bastam — nada de `toISOString()`,
 * que converteria para UTC e deslocaria a comparação.
 */

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Hora de parede atual, no mesmo formato ingênuo que o backend usa. */
export function nowNaive(): string {
  const now = new Date();
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  return `${date}T${time}`;
}

/** Só a data de hoje (`YYYY-MM-DD`) — é como o backend guarda vencimentos. */
export function todayNaive(): string {
  return nowNaive().slice(0, 10);
}

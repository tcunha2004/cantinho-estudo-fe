/** Retorna as iniciais (primeiro + último nome) para avatares, ex.: "Renata Lima" → "RL". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

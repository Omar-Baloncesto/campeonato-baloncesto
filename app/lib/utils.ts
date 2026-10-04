export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Parse a number coming from Sheets, accepting the Spanish decimal comma ("22,3"). */
export function parseSheetNumber(value: string | number | undefined | null): number {
  if (typeof value === 'number') return value;
  const n = parseFloat((value ?? '').toString().trim().replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** Points per game actually played; 0 when the player has not attended any date. */
export function calcPromedio(totalPuntos: number, asistencias: number): number {
  return asistencias > 0 ? totalPuntos / asistencias : 0;
}

/** One decimal with the Spanish comma, as the sheet displays it ("22,3"). */
export function formatPromedio(promedio: number): string {
  return promedio.toFixed(1).replace('.', ',');
}

/**
 * Map player name → number of dates attended, read from the
 * AsistenciasJugadores sheet (name in col A, attended count in col L).
 * This is the source of truth for attendance: the ranking block in
 * PuntosJugadores (cols H:K) is a static copy that can drift from it.
 */
export function buildAsistenciasMap(rows: string[][]): Map<string, number> {
  const map = new Map<string, number>();
  rows.forEach((r) => {
    const n = (r[0] || '').trim();
    const lo = n.toLowerCase();
    if (!n || lo === 'jugador' || lo === 'nombre jugador' || lo.startsWith('equipo')) return;
    const count = parseInt(r[11], 10);
    if (Number.isFinite(count)) map.set(n, count);
  });
  return map;
}

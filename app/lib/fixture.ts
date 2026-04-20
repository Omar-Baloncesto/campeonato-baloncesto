/**
 * Shared types and parsers for the FIXTURE sheet.
 * Used by /fixture, /predicciones, /asistencias to avoid drift between
 * each page's own copy of the row -> object mapping.
 */

export interface Partido {
  id: string;
  jornada: string;
  local: string;
  visitante: string;
  fecha: string;
  hora: string;
  marcadorLocal: number;
  marcadorVisitante: number;
}

/**
 * Parse the FIXTURE sheet rows (raw 2D array including the header row).
 * Skips the header and any rows missing an id in column 0.
 */
export function parseFixtureRows(rows: string[][]): Partido[] {
  if (!Array.isArray(rows) || rows.length < 2) return [];
  return rows
    .slice(1)
    .filter((r) => r[0])
    .map((r) => ({
      id: r[0],
      jornada: r[1],
      local: r[2],
      visitante: r[4],
      fecha: r[5],
      hora: r[6],
      marcadorLocal: parseInt(r[7], 10) || 0,
      marcadorVisitante: parseInt(r[8], 10) || 0,
    }));
}

/** True when the match has a non-zero score on either side. */
export function isJugado(p: Partido): boolean {
  return p.marcadorLocal > 0 || p.marcadorVisitante > 0;
}

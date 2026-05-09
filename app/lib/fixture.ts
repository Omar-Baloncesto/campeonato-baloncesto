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
  /** Column K = "W.O." (no-show, score discarded). Mutually exclusive with retiro. */
  wo: boolean;
  /** Column K = "RETIRO" (FIBA default — partial score stands, league points 0/2). */
  retiro: boolean;
  /** Column L: name of the team that defaulted (no-show or withdrew). */
  equipoAusente: string;
}

const RETIRO_TOKENS = new Set(['RETIRO', 'RETIRADA', 'RET']);

/**
 * Parse the FIXTURE sheet rows (raw 2D array including the header row).
 * Skips the header and any rows missing an id in column 0.
 */
export function parseFixtureRows(rows: string[][]): Partido[] {
  if (!Array.isArray(rows) || rows.length < 2) return [];
  return rows
    .slice(1)
    .filter((r) => r[0])
    .map((r) => {
      const equipoAusente = (r[11] || '').trim();
      const flagCell = (r[10] || '').trim();
      const flagUpper = flagCell.toUpperCase();
      const retiro = RETIRO_TOKENS.has(flagUpper);
      const wo = !retiro && (flagCell.length > 0 || equipoAusente.length > 0);
      return {
        id: r[0],
        jornada: r[1],
        local: r[2],
        visitante: r[4],
        fecha: r[5],
        hora: r[6],
        marcadorLocal: parseInt(r[7], 10) || 0,
        marcadorVisitante: parseInt(r[8], 10) || 0,
        wo,
        retiro,
        equipoAusente,
      };
    });
}

/** True when the match has a non-zero score on either side, or a W.O./retiro was registered. */
export function isJugado(p: Partido): boolean {
  return p.marcadorLocal > 0 || p.marcadorVisitante > 0 || p.wo || p.retiro;
}

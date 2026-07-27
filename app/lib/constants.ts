export interface TeamConfig {
  id: string;
  name: string;
  abbr: string;
  color: string;
  safeColor: string; // safe for display on dark backgrounds
  photo: string;
}

export const TEAMS: Record<string, TeamConfig> = {
  '1': { id: '1', name: 'Miami Heat',            abbr: 'MIA', color: '#FFFFFF', safeColor: '#CCCCCC', photo: '/teams/miami-heat.jpg' },
  '2': { id: '2', name: 'Brooklyn Nets',         abbr: 'BKN', color: '#AAAAAA', safeColor: '#AAAAAA', photo: '/teams/brooklyn-nets.jpg' },
  '3': { id: '3', name: 'Boston Celtics',        abbr: 'BOS', color: '#22c55e', safeColor: '#22c55e', photo: '/teams/boston-celtics.jpg' },
  '4': { id: '4', name: 'Oklahoma City Thunder', abbr: 'OKC', color: '#00BFFF', safeColor: '#00BFFF', photo: '/teams/oklahoma-city-thunder.jpg' },
  '5': { id: '5', name: 'Los Angeles Lakers',    abbr: 'LAL', color: '#FFD700', safeColor: '#FFD700', photo: '/teams/los-angeles-lakers.jpg' },
  '6': { id: '6', name: 'Toronto Raptors',       abbr: 'TOR', color: '#FF0000', safeColor: '#FF0000', photo: '/teams/toronto-raptors.jpg' },
};

export const TEAM_BY_NAME: Record<string, TeamConfig> = Object.fromEntries(
  Object.values(TEAMS).map(t => [t.name, t])
);

/**
 * Colores cargados en tiempo de ejecución desde la hoja EQUIPOS (columna F).
 * Se indexan por id de equipo y por nombre normalizado, para que las páginas
 * (Fixture, Posiciones, Bracket, etc.) resuelvan el color de los equipos que
 * use el campeonato actual — no solo los que están fijos en TEAMS.
 *
 * Los equipos fijos en TEAMS tienen prioridad (para no cambiar semestres
 * anteriores); si un equipo no está ahí, se usa el color de la hoja.
 */
const sheetColors: Record<string, string> = {};

const normName = (s: string): string => s.trim().toLowerCase();

export function registerTeamColors(
  teams: { id?: string; name?: string; color?: string }[]
): void {
  teams.forEach(({ id, name, color }) => {
    const c = (color || '').trim();
    if (!c) return;
    if (id) sheetColors[String(id).trim()] = c;
    if (name) sheetColors[normName(name)] = c;
  });
}

function sheetColorOf(nameOrId: string): string | undefined {
  return sheetColors[nameOrId] || sheetColors[normName(nameOrId)];
}

/** Código de color hex válido: #RGB o #RRGGBB. */
const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Devuelve el PRIMER código hex de una fila de EQUIPOS (de la col. C en
 * adelante). Así el color funciona sin importar en qué columna esté y evita
 * quedarse con el nombre del color en español (p. ej. "Blanco").
 */
export function firstHexInRow(row: string[]): string | undefined {
  for (let i = 2; i < row.length; i++) {
    const cell = String(row[i] ?? '').trim();
    if (HEX_RE.test(cell)) return cell;
  }
  return undefined;
}

export interface SheetTeam {
  id: string;
  name: string;
  color: string;
}

/**
 * Equipos del campeonato actual, cargados desde la hoja EQUIPOS. Sustituyen a
 * TEAMS para nombres/colores en las páginas, de modo que al crear un
 * campeonato nuevo (equipos y colores distintos) todo cambie automáticamente.
 */
const sheetTeams: SheetTeam[] = [];
const sheetNameById: Record<string, string> = {};
const sheetNameSet = new Set<string>();

export function registerTeams(
  teams: { id?: string; name?: string; color?: string }[]
): void {
  sheetTeams.length = 0;
  for (const k of Object.keys(sheetNameById)) delete sheetNameById[k];
  sheetNameSet.clear();

  teams.forEach(({ id, name, color }) => {
    const c = (color || '').trim();
    const idStr = id != null ? String(id).trim() : '';
    const nm = (name || '').trim();
    if (c) {
      if (idStr) sheetColors[idStr] = c;
      if (nm) sheetColors[normName(nm)] = c;
    }
    if (idStr && nm) sheetNameById[idStr] = nm;
    if (nm) sheetNameSet.add(normName(nm));
    if (idStr || nm) sheetTeams.push({ id: idStr, name: nm, color: c });
  });
}

/** Nombre del equipo (de la hoja) por su id; undefined si no está. */
export function getTeamName(id: string): string | undefined {
  return sheetNameById[String(id).trim()];
}

/** Lista de equipos del campeonato actual (de la hoja EQUIPOS). */
export function getSheetTeams(): SheetTeam[] {
  return sheetTeams;
}

/** True si el texto es un nombre de equipo conocido (hoja o fijo). */
export function isKnownTeamName(name: string): boolean {
  const n = (name || '').trim();
  if (!n) return false;
  return sheetNameSet.has(normName(n)) || !!TEAM_BY_NAME[n];
}

/**
 * Estilo para un "swatch" de color (punto/barra) del equipo. El blanco se
 * muestra BLANCO con borde gris para que sea visible sobre fondos claros.
 * Acepta nombre o id de equipo, o directamente un color hex.
 */
export function teamSwatch(nameOrId: string): {
  background: string;
  border: string;
} {
  const hex = HEX_RE.test((nameOrId || '').trim())
    ? nameOrId.trim()
    : getTeamColorRaw(nameOrId);
  const white = /^#(?:fff|ffffff)$/i.test(hex);
  return {
    background: white ? '#FFFFFF' : hex,
    border: white ? '1px solid #B0B0B0' : 'none',
  };
}

export function getTeamColor(nameOrId: string): string {
  const team = TEAMS[nameOrId] || TEAM_BY_NAME[nameOrId];
  if (team) return team.safeColor;
  return sheetColorOf(nameOrId) || '#888888';
}

export function getTeamColorRaw(nameOrId: string): string {
  const team = TEAMS[nameOrId] || TEAM_BY_NAME[nameOrId];
  if (team) return team.color;
  return sheetColorOf(nameOrId) || '#888888';
}

export function isWhiteTeam(nameOrId: string): boolean {
  const team = TEAMS[nameOrId] || TEAM_BY_NAME[nameOrId];
  if (team) return team.color === '#FFFFFF';
  const c = sheetColorOf(nameOrId);
  return !!c && /^#?(?:fff|ffffff)$/i.test(c.trim());
}

export const NAV_ITEMS = [
  { label: 'Equipos',              href: '/',                       icon: '🏀' },
  { label: 'Posiciones',           href: '/posiciones',             icon: '🏆' },
  { label: 'Fixture',              href: '/fixture',                icon: '🗓' },
  { label: 'Jugadores',            href: '/jugadores',              icon: '👤' },
  { label: 'Estadísticas',         href: '/estadisticas',           icon: '📊' },
  { label: 'Estadísticas por Equipo', href: '/estadisticas-equipos',   icon: '📊' },
  { label: 'Puntos de Jugadores',     href: '/estadistica-jugadores',  icon: '📋' },
  { label: 'Asistencias',          href: '/asistencias',            icon: '📋' },
  { label: 'Marcadores',           href: '/lista-equipos',          icon: '🏀' },
  { label: 'Equipos Empatados',    href: '/equipos-empatados',      icon: '🤝' },
  { label: 'Predicciones',         href: '/predicciones',           icon: '🎯' },
  { label: 'Bracket',              href: '/bracket',                icon: '🏆' },
];

/**
 * Fotos de los equipos alojadas en Google Drive (carpeta "Fotos Equipos
 * Baloncesto"), por id de equipo. Se muestran directamente desde Drive, así
 * que los archivos deben estar compartidos como "Cualquier persona con el
 * enlace". Al cambiar de torneo se actualizan estos ids.
 */
export const TEAM_PHOTO_DRIVE_IDS: Record<string, string> = {
  '1': '1uO9e6J-9d7BrHUP3Qv2NCEWxq5UILfuT', // REAL MADRID
  '2': '18qQdrfu-rTDsnZEQRu1Nbu9PiH46yUxI', // OLYMPIACOS
  '3': '1GXFSXCtnMYkhaITPc_7LyD4NNXerNk_8', // FC BARCELONA
  '4': '1UMe9tWlhRFTR5yrZjXs9RY7kwGEJrgUm', // PANATHINAIKOS
  '5': '1oginn23od7ER3Asn8JvjTI3KR_XU5PH6', // VIRTUS BOLOGNA
  '6': '152LSb5d3Q4L2gB7JFN1cll7As8lxYkQd', // ANADOLU EFES
};

/** URL pública de la foto del equipo (miniatura de Drive), o null si no hay. */
export function getTeamPhotoUrl(id: string): string | null {
  const fileId = TEAM_PHOTO_DRIVE_IDS[String(id).trim()];
  return fileId
    ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`
    : null;
}

export const APP_CONFIG = {
  title: 'CAMPEONATO BALONCESTO',
  subtitle: 'CÚCUTA · PRIMER SEMESTRE 2026',
  year: 2026,
};

/**
 * Public base URL of the deployed site, used by robots.ts / sitemap.ts /
 * per-page metadata. Set NEXT_PUBLIC_SITE_URL in Vercel to point at the
 * production domain. Falls back to the Vercel preview domain or local dev.
 */
export const SITE_URL = (() => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  return 'http://localhost:3000';
})();

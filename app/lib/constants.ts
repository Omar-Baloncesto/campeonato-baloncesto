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

export function getTeamColor(nameOrId: string): string {
  const team = TEAMS[nameOrId] || TEAM_BY_NAME[nameOrId];
  return team?.safeColor || '#888888';
}

export function getTeamColorRaw(nameOrId: string): string {
  const team = TEAMS[nameOrId] || TEAM_BY_NAME[nameOrId];
  return team?.color || '#888888';
}

export function isWhiteTeam(nameOrId: string): boolean {
  const team = TEAMS[nameOrId] || TEAM_BY_NAME[nameOrId];
  return team?.color === '#FFFFFF';
}

export const NAV_ITEMS = [
  { label: 'Equipos',              href: '/',                       icon: '🏀' },
  { label: 'Posiciones',           href: '/posiciones',             icon: '🏆' },
  { label: 'Fixture',              href: '/fixture',                icon: '🗓' },
  { label: 'Jugadores',            href: '/jugadores',              icon: '👤' },
  { label: 'Estadísticas',         href: '/estadisticas',           icon: '📊' },
  { label: 'Stats por equipo',     href: '/estadisticas-equipos',   icon: '📊' },
  { label: 'Ranking de jugadores', href: '/estadistica-jugadores',  icon: '📋' },
  { label: 'Asistencias',          href: '/asistencias',            icon: '📋' },
  { label: 'Marcadores',           href: '/lista-equipos',          icon: '🏀' },
  { label: 'Predicciones',         href: '/predicciones',           icon: '🎯' },
  { label: 'Bracket',              href: '/bracket',                icon: '🏆' },
];

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

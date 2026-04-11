'use client';
import { useEffect, useState } from 'react';
import { TEAMS } from '../lib/constants';
import LoadingState, { ErrorState } from '../components/LoadingState';
import FilterPills from '../components/FilterPills';
import DataFreshness from '../components/DataFreshness';
import SearchInput from '../components/SearchInput';
import { normalizeText } from '../lib/utils';

function getInitials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return nombre.slice(0, 2).toUpperCase();
}

interface Jugador {
  id: string;
  nombre: string;
  equipoId: string;
  numero: string;
  posicion: string;
}

interface PlayerStats {
  totalPuntos: number;
  asistencias: number;
  promedio: number;
  p1: number;
  p2: number;
  p3: number;
  totalBreakdown: number;
  fechas: string[];
  asistenciaCount: number;
  totalFechas: number;
  porcentaje: string;
}

const FECHAS_LABELS = ['21/02', '28/02', '7/03', '14/03', '26/03', '11/04', '18/04', '25/04', '2/05', '9/05'];

const EQUIPOS_PUNTOS: Record<string, { filaInicio: number; filaFin: number }> = {
  'Miami Heat': { filaInicio: 2, filaFin: 12 },
  'Brooklyn Nets': { filaInicio: 16, filaFin: 25 },
  'Boston Celtics': { filaInicio: 30, filaFin: 40 },
  'Oklahoma City Thunder': { filaInicio: 44, filaFin: 53 },
  'Los Angeles Lakers': { filaInicio: 58, filaFin: 68 },
  'Toronto Raptors': { filaInicio: 72, filaFin: 81 },
};

const EQUIPOS_ASIST: Record<string, { inicio: number; fin: number }> = {
  'Miami Heat': { inicio: 4, fin: 14 },
  'Brooklyn Nets': { inicio: 22, fin: 31 },
  'Boston Celtics': { inicio: 40, fin: 50 },
  'Oklahoma City Thunder': { inicio: 58, fin: 68 },
  'Los Angeles Lakers': { inicio: 76, fin: 86 },
  'Toronto Raptors': { inicio: 93, fin: 103 },
};

export default function Jugadores() {
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [equipoFiltro, setEquipoFiltro] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [statsCache, setStatsCache] = useState<Record<string, PlayerStats>>({});
  const [loadingStats, setLoadingStats] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    setError(false);
    fetch('/api/sheets?sheet=JUGADORES')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data.length > 1) {
          const rows = data.data.slice(1).filter((r: string[]) => r[1]);
          setJugadores(rows.map((r: string[]) => ({
            id: r[0], nombre: r[1], equipoId: r[2],
            numero: r[3], posicion: r[4],
          })));
          setLastUpdated(new Date());
        } else if (!data.success) setError(true);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, []);

  const toggleExpand = async (j: Jugador) => {
    if (expanded === j.id) {
      setExpanded(null);
      return;
    }
    setExpanded(j.id);

    if (statsCache[j.id]) return;

    const teamName = TEAMS[j.equipoId]?.name || '';
    setLoadingStats(j.id);

    try {
      const [ptsRes, attRes] = await Promise.all([
        fetch('/api/sheets?sheet=PuntosJugadores').then(r => r.json()),
        fetch('/api/sheets?sheet=AsistenciasJugadores').then(r => r.json()),
      ]);

      const stats: PlayerStats = {
        totalPuntos: 0, asistencias: 0, promedio: 0,
        p1: 0, p2: 0, p3: 0, totalBreakdown: 0,
        fechas: [], asistenciaCount: 0, totalFechas: 0, porcentaje: '0%',
      };

      if (ptsRes.success) {
        const rows = ptsRes.data;
        const statsRow = rows.slice(1).find(
          (r: string[]) => r[7] && r[7].trim() === j.nombre.trim()
        );
        if (statsRow) {
          stats.totalPuntos = parseFloat(statsRow[8]) || 0;
          stats.asistencias = parseFloat(statsRow[9]) || 0;
          stats.promedio = parseFloat(statsRow[10]) || 0;
        }

        const tc = EQUIPOS_PUNTOS[teamName];
        if (tc) {
          const playerRow = rows.slice(tc.filaInicio - 1, tc.filaFin).find(
            (r: string[]) => r[0] && r[0].trim() === j.nombre.trim()
          );
          if (playerRow) {
            stats.p1 = parseInt(playerRow[1]) || 0;
            stats.p2 = parseInt(playerRow[2]) || 0;
            stats.p3 = parseInt(playerRow[3]) || 0;
            stats.totalBreakdown = parseInt(playerRow[4]) || 0;
          }
        }
      }

      if (attRes.success) {
        const rows = attRes.data;
        const ac = EQUIPOS_ASIST[teamName];
        if (ac) {
          const playerRow = rows.slice(ac.inicio - 1, ac.fin).find(
            (r: string[]) => r[0] && r[0].trim() === j.nombre.trim()
          );
          if (playerRow) {
            stats.fechas = [playerRow[1], playerRow[2], playerRow[3], playerRow[4], playerRow[5],
                            playerRow[6], playerRow[7], playerRow[8], playerRow[9], playerRow[10]];
            stats.asistenciaCount = parseInt(playerRow[11]) || 0;
            stats.totalFechas = parseInt(playerRow[12]) || 0;
            stats.porcentaje = playerRow[14] || '0%';
          }
        }
      }

      setStatsCache(prev => ({ ...prev, [j.id]: stats }));
    } catch (e) {
      console.error('Error fetching stats:', e);
    } finally {
      setLoadingStats(null);
    }
  };

  const filtrados = (equipoFiltro === 'Todos'
    ? [...jugadores].sort((a, b) => Number(a.equipoId) - Number(b.equipoId))
    : jugadores.filter(j => j.equipoId === equipoFiltro)
  ).filter(j => !searchTerm || normalizeText(j.nombre).includes(normalizeText(searchTerm)));

  const filterItems = [
    { key: 'Todos', label: 'Todos', color: '#F5B800' },
    ...Object.entries(TEAMS).map(([id, t]) => ({
      key: id, label: t.name, color: t.safeColor,
    })),
  ];

  return (
    <div className="animate-fade-in">
      <div className="px-4 md:px-6 pt-4 flex items-center justify-between">
        <h2 className="text-sm text-text-muted uppercase tracking-widest flex items-center gap-2">
          <span className="w-1 h-4 bg-gold rounded-full" />
          Jugadores
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted">{filtrados.length} jugadores</span>
          <DataFreshness lastUpdated={lastUpdated} onRefresh={fetchData} loading={loading} />
        </div>
      </div>

      <div className="px-4 md:px-6 py-4">
        <FilterPills
          items={filterItems}
          active={equipoFiltro}
          onChange={setEquipoFiltro}
          variant="outline"
        />
      </div>

      <div className="px-4 md:px-6 pb-2">
        <SearchInput value={searchTerm} onChange={setSearchTerm} />
      </div>

      <div className="px-4 md:px-6 pb-8">
        {loading ? (
          <LoadingState message="Cargando jugadores..." />
        ) : error ? (
          <ErrorState onRetry={fetchData} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger-children">
            {filtrados.map(j => {
              const team = TEAMS[j.equipoId];
              const color = team?.safeColor || '#888';
              const isWhite = team?.color === '#FFFFFF';
              const isExpanded = expanded === j.id;
              const st = statsCache[j.id];
              const isLoading = loadingStats === j.id;

              return (
                <div
                  key={j.id}
                  className="glass-card rounded-xl overflow-hidden glow-hover group"
                  style={{ borderColor: color + '15' }}
                >
                  {/* Player card header */}
                  <div
                    className="p-4 flex items-center gap-3.5 cursor-pointer"
                    onClick={() => toggleExpand(j)}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex flex-col items-center justify-center shrink-0 transition-transform group-hover:scale-105 select-none"
                      style={{
                        background: isWhite ? '#cccccc' : color,
                        color: '#ffffff',
                        boxShadow: `0 2px 10px ${color}40`,
                      }}
                    >
                      <span className="text-sm font-bold leading-none">{getInitials(j.nombre)}</span>
                      {j.numero && <span className="text-[9px] font-semibold leading-none mt-0.5 opacity-80">#{j.numero}</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium leading-tight truncate">{j.nombre}</div>
                      <div className="text-[11px] mt-1 font-medium" style={{ color }}>{team?.name || `Equipo ${j.equipoId}`}</div>
                      <div className="text-[10px] text-text-muted/70 mt-0.5">{j.posicion}</div>
                    </div>
                    <svg
                      className={`w-4 h-4 text-text-muted transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Expandable stats */}
                  <div className={`expand-content ${isExpanded ? 'open' : ''}`}>
                    <div>
                      {isLoading ? (
                        <div className="px-4 pb-4 text-center">
                          <div className="spinner mx-auto mb-2" style={{ width: 28, height: 28, borderWidth: 2 }} />
                          <span className="text-xs text-text-muted">Cargando...</span>
                        </div>
                      ) : st ? (
                        <div className="px-4 pb-4" style={{ borderTop: `1px solid ${color}20` }}>
                          {/* General stats row */}
                          <div className="grid grid-cols-3 gap-2 py-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                            <div className="text-center">
                              <div className="text-[10px] text-text-muted uppercase">Puntos</div>
                              <div className="text-lg font-bold" style={{ color }}>{st.totalPuntos}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[10px] text-text-muted uppercase">Asistencias</div>
                              <div className="text-lg font-bold" style={{ color }}>{st.asistencias}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[10px] text-text-muted uppercase">Promedio</div>
                              <div className="text-lg font-bold" style={{ color }}>{st.promedio.toFixed(1)}</div>
                            </div>
                          </div>

                          {/* Point breakdown bars */}
                          {st.totalBreakdown > 0 && (
                            <div className="py-3" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                              <div className="text-[10px] text-text-muted uppercase mb-2">Desglose de puntos</div>
                              {[
                                { label: 'P. de 1', val: st.p1 },
                                { label: 'P. de 2', val: st.p2 },
                                { label: 'P. de 3', val: st.p3 },
                              ].map(b => {
                                const max = Math.max(st.p1, st.p2, st.p3, 1);
                                const pct = (b.val / max) * 100;
                                return (
                                  <div key={b.label} className="mb-1.5">
                                    <div className="flex items-center justify-between mb-0.5">
                                      <span className="text-[11px] text-text-muted">{b.label}</span>
                                      <span className="text-[12px] font-bold text-text-primary">{b.val}</span>
                                    </div>
                                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-darkest)' }}>
                                      <div
                                        className="h-full rounded-full"
                                        style={{ width: `${pct}%`, background: color, transition: 'width 0.5s' }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Attendance */}
                          {st.fechas.length > 0 && (
                            <div className="pt-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] text-text-muted uppercase">Asistencia</span>
                                <span className={`text-sm font-bold ${
                                  parseFloat(st.porcentaje) >= 80 ? 'text-positive' :
                                  parseFloat(st.porcentaje) >= 50 ? 'text-gold' : 'text-negative'
                                }`}>{st.porcentaje}</span>
                              </div>
                              <div className="flex gap-1">
                                {st.fechas.map((f, i) => (
                                  <div key={i} className="flex-1 text-center">
                                    <div
                                      className={`aspect-square rounded flex items-center justify-center text-[10px] font-bold ${
                                        f === '1' ? 'bg-positive/20 text-positive' :
                                        f === '0' && i < st.totalFechas ? 'bg-negative/20 text-negative' :
                                        'text-text-muted/30'
                                      }`}
                                      style={{ background: f !== '1' && !(f === '0' && i < st.totalFechas) ? 'var(--color-bg-darkest)' : undefined }}
                                    >
                                      {f === '1' ? '✓' : f === '0' && i < st.totalFechas ? '✗' : '—'}
                                    </div>
                                    <div className="text-[7px] text-text-muted mt-0.5">{FECHAS_LABELS[i]}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Empty state if no data at all */}
                          {st.totalPuntos === 0 && st.totalBreakdown === 0 && st.fechas.length === 0 && (
                            <div className="py-4 text-center text-xs text-text-muted">
                              Sin estadisticas disponibles
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

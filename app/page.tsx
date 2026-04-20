'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Image, { type StaticImageData } from 'next/image';
import miamiHeatPhoto from '../public/teams/miami-heat.jpg';
import brooklynNetsPhoto from '../public/teams/brooklyn-nets.jpg';
import bostonCelticsPhoto from '../public/teams/boston-celtics.jpg';
import oklahomaCityThunderPhoto from '../public/teams/oklahoma-city-thunder.jpg';
import losAngelesLakersPhoto from '../public/teams/los-angeles-lakers.jpg';
import torontoRaptorsPhoto from '../public/teams/toronto-raptors.jpg';
import { TEAMS } from './lib/constants';
import { ErrorState } from './components/LoadingState';
import DataFreshness from './components/DataFreshness';

// Static imports give Next/Image the intrinsic width/height so we get no
// layout shift while the optimized version is loading.
const TEAM_PHOTOS: Record<string, StaticImageData> = {
  '1': miamiHeatPhoto,
  '2': brooklynNetsPhoto,
  '3': bostonCelticsPhoto,
  '4': oklahomaCityThunderPhoto,
  '5': losAngelesLakersPhoto,
  '6': torontoRaptorsPhoto,
};

interface Equipo {
  id: string;
  nombre: string;
  hexColor: string;
}

interface TeamStats {
  nombre: string;
  pj: number;
  pg: number;
  pp: number;
  puntosAnotados: number;
  puntosRecibidos: number;
  diferencia: number;
  puntos: number;
  puesto: string;
}

export default function Dashboard() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [totalJugadores, setTotalJugadores] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [statsMap, setStatsMap] = useState<Record<string, TeamStats>>({});
  const [topScorers, setTopScorers] = useState<Record<string, { nombre: string; puntos: number }>>({});
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    setLoading(true);
    setError(false);

    Promise.all([
      fetch('/api/sheets?sheet=EQUIPOS', { signal }).then(r => r.json()),
      fetch('/api/sheets?sheet=JUGADORES', { signal }).then(r => r.json()),
      fetch('/api/sheets?sheet=TablaPosiciones', { signal }).then(r => r.json()),
      fetch('/api/sheets?sheet=PuntosJugadores', { signal }).then(r => r.json()),
    ])
      .then(([eqData, jugData, posData, ptsData]) => {
        if (signal.aborted) return;
        let teamNames: Record<string, string> = {};
        if (eqData.success && Array.isArray(eqData.data) && eqData.data.length > 1) {
          const rows = eqData.data.slice(1).filter((r: string[]) => r[1]);
          setEquipos(rows.map((r: string[]) => ({
            id: r[0], nombre: r[1], hexColor: r[5] || '#888888',
          })));
          rows.forEach((r: string[]) => { teamNames[r[0]] = r[1]; });
        }
        // Build player->team map from JUGADORES
        const playerTeam: Record<string, string> = {};
        if (jugData.success && Array.isArray(jugData.data) && jugData.data.length > 1) {
          const jugRows = jugData.data.slice(1).filter((r: string[]) => r[1]);
          setTotalJugadores(jugRows.length);
          jugRows.forEach((r: string[]) => {
            if (r[1] && r[2]) {
              playerTeam[r[1].trim()] = teamNames[r[2]] || '';
            }
          });
        }
        if (posData.success && Array.isArray(posData.data) && posData.data.length > 1) {
          const map: Record<string, TeamStats> = {};
          posData.data.slice(1).filter((r: string[]) => r[0]).forEach((r: string[]) => {
            map[r[0]] = {
              nombre: r[0],
              pj: Number(r[1]) || 0,
              pg: Number(r[2]) || 0,
              pp: Number(r[3]) || 0,
              puntosAnotados: Number(r[4]) || 0,
              puntosRecibidos: Number(r[5]) || 0,
              diferencia: Number(r[6]) || 0,
              puntos: Number(r[7]) || 0,
              puesto: r[8] || '',
            };
          });
          setStatsMap(map);
        }
        // Find top scorer per team
        if (ptsData.success && Array.isArray(ptsData.data) && ptsData.data.length > 1) {
          const scorers: Record<string, { nombre: string; puntos: number }> = {};
          ptsData.data.slice(1)
            .filter((r: string[]) => r[7] && r[7] !== 'NOMBRE JUGADOR')
            .forEach((r: string[]) => {
              const playerName = r[7].trim();
              const pts = parseFloat(r[8]) || 0;
              const teamName = playerTeam[playerName];
              if (teamName && (!scorers[teamName] || pts > scorers[teamName].puntos)) {
                scorers[teamName] = { nombre: playerName, puntos: pts };
              }
            });
          setTopScorers(scorers);
        }
        if (!eqData.success && !jugData.success) setError(true);
        else setLastUpdated(new Date());
        setLoading(false);
      })
      .catch((err) => {
        if (err?.name === 'AbortError' || signal.aborted) return;
        setError(true);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchData();
    return () => { abortRef.current?.abort(); };
  }, [fetchData]);

  const badgeColor = (eq: Equipo) => TEAMS[eq.id]?.safeColor || eq.hexColor;

  const stats = [
    { value: '6', label: 'Equipos', icon: '🏀' },
    { value: '10', label: 'Partidos', icon: '🗓' },
    { value: loading ? '...' : String(totalJugadores), label: 'Jugadores', icon: '👥' },
    { value: '2', label: 'Rondas', icon: '🏆' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Stats bar with icons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-bg-darkest border-b border-border-light">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="bg-bg-secondary px-4 py-4 md:px-5 md:py-5 text-center group hover:bg-bg-card transition-colors relative overflow-hidden"
          >
            {/* Subtle gradient accent */}
            <div className="absolute inset-0 bg-gradient-to-b from-gold/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="text-lg mb-1 opacity-60">{s.icon}</div>
              <div className="text-2xl md:text-3xl font-bold gradient-text count-up" style={{ animationDelay: `${i * 100}ms` }}>
                {s.value}
              </div>
              <div className="text-[11px] text-text-muted uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Team cards */}
      <section className="p-4 md:p-6" aria-label="Equipos participantes">
        <div className="glass-card rounded-xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm text-text-muted uppercase tracking-widest flex items-center gap-2">
              <span className="w-1 h-4 bg-gold rounded-full" />
              Equipos participantes
            </h2>
            <DataFreshness lastUpdated={lastUpdated} onRefresh={fetchData} loading={loading} />
          </div>

          {loading ? (
            <div className="text-text-muted text-center py-12">
              <div className="spinner mx-auto mb-4" />
              <span className="text-sm tracking-wide">Cargando equipos...</span>
            </div>
          ) : error ? (
            <ErrorState
              message="No se pudieron cargar los equipos. Verifica tu conexión a internet."
              onRetry={fetchData}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-start gap-4 stagger-children">
              {equipos.map((eq, idx) => {
                const color = badgeColor(eq);
                const photo = TEAM_PHOTOS[eq.id];
                const isExpanded = expandedTeam === eq.nombre;
                const st = statsMap[eq.nombre];
                const scorer = topScorers[eq.nombre];
                const pj = st?.pj || 1;
                const ppgOff = st ? (st.puntosAnotados / pj).toFixed(1) : '—';
                const ppgDef = st ? (st.puntosRecibidos / pj).toFixed(1) : '—';
                const ratio = st && st.puntosRecibidos > 0 ? (st.puntosAnotados / st.puntosRecibidos).toFixed(2) : '—';
                const winPct = st ? ((st.pg / pj) * 100).toFixed(0) : '—';

                return (
                  <div
                    key={eq.id}
                    className="bg-bg-card rounded-xl border border-border-light glow-hover cursor-pointer group"
                    onClick={() => setExpandedTeam(prev => prev === eq.nombre ? null : eq.nombre)}
                  >
                    {photo && (
                      <div className="relative w-full">
                        <Image
                          src={photo}
                          alt={`Foto del equipo ${eq.nombre}`}
                          className="w-full h-auto block rounded-t-xl"
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          priority={idx < 3}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-t-xl" />
                      </div>
                    )}
                    <div className="p-4 flex items-center gap-3">
                      <div
                        className="w-3 h-8 rounded-full shrink-0"
                        style={{
                          background: color,
                          boxShadow: `0 0 8px ${color}40`,
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold group-hover:text-text-primary transition-colors">{eq.nombre}</div>
                        <div className="text-[11px] text-text-muted mt-0.5">Cúcuta</div>
                      </div>
                      <svg
                        className={`w-4 h-4 text-text-muted transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {/* Expandable stats */}
                    <div className={`expand-content ${isExpanded ? 'open' : ''}`}>
                      <div>
                        {st ? (
                          <div className="px-4 pb-4 border-t border-border-subtle">
                            {/* Puesto + Pts */}
                            <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                              <span className="text-[11px] text-text-muted uppercase tracking-wider">Puesto</span>
                              <span className="text-lg font-bold gradient-text">{st.puesto}°</span>
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                              <span className="text-[11px] text-text-muted uppercase tracking-wider">Puntos</span>
                              <span className="text-lg font-bold text-gold">{st.puntos}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 py-3 border-b border-border-subtle">
                              <div className="text-center">
                                <div className="text-[10px] text-text-muted uppercase">PJ</div>
                                <div className="text-sm font-bold text-text-primary">{st.pj}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-[10px] text-text-muted uppercase">PG</div>
                                <div className="text-sm font-bold text-positive">{st.pg}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-[10px] text-text-muted uppercase">PP</div>
                                <div className="text-sm font-bold text-negative">{st.pp}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 py-3 border-b border-border-subtle">
                              <div className="text-center">
                                <div className="text-[10px] text-text-muted uppercase">P. Ano.</div>
                                <div className="text-sm font-bold text-text-primary">{st.puntosAnotados}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-[10px] text-text-muted uppercase">P. Rec.</div>
                                <div className="text-sm font-bold text-text-primary">{st.puntosRecibidos}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-[10px] text-text-muted uppercase">Dif.</div>
                                <div className={`text-sm font-bold ${st.diferencia >= 0 ? 'text-positive' : 'text-negative'}`}>
                                  {st.diferencia > 0 ? '+' : ''}{st.diferencia}
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-3">
                              <div className="text-center p-2 rounded-lg bg-bg-secondary border border-border-subtle">
                                <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Prom. Pts/Part.</div>
                                <div className="text-lg font-bold text-positive">{ppgOff}</div>
                              </div>
                              <div className="text-center p-2 rounded-lg bg-bg-secondary border border-border-subtle">
                                <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Prom. Pts Rec./Part.</div>
                                <div className="text-lg font-bold text-negative">{ppgDef}</div>
                              </div>
                              <div className="text-center p-2 rounded-lg bg-bg-secondary border border-border-subtle">
                                <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Ratio PF/PC</div>
                                <div className="text-lg font-bold text-gold">{ratio}</div>
                              </div>
                              <div className="text-center p-2 rounded-lg bg-bg-secondary border border-border-subtle">
                                <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">% Victorias</div>
                                <div className="text-lg font-bold text-text-primary">{winPct}%</div>
                              </div>
                            </div>
                            {/* Top scorer */}
                            {scorer && (
                              <div className="flex items-center justify-between pt-3 mt-3 border-t border-border-subtle">
                                <div>
                                  <div className="text-[10px] text-text-muted uppercase tracking-wider">Máx. Anotador</div>
                                  <div className="text-sm font-medium text-text-primary mt-0.5">{scorer.nombre}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold gradient-text">{scorer.puntos}</div>
                                  <div className="text-[10px] text-text-muted">pts</div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="px-4 py-6 text-center text-text-muted text-xs">
                            Sin estadísticas disponibles
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { getTeamColor, isWhiteTeam } from '../lib/constants';
import LoadingState, { ErrorState } from '../components/LoadingState';
import DataFreshness from '../components/DataFreshness';

interface Equipo {
  nombre: string;
  pj: string;
  pg: string;
  pp: string;
  puntosAnotados: string;
  puntosRecibidos: string;
  diferencia: string;
  puntos: string;
  puesto: string;
}

export default function Posiciones() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    setError(false);
    fetch('/api/sheets?sheet=TablaPosiciones')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data.length > 1) {
          const rows = data.data.slice(1).filter((r: string[]) => r[0]);
          setEquipos(rows.map((r: string[]) => ({
            nombre: r[0], pj: r[1], pg: r[2], pp: r[3],
            puntosAnotados: r[4], puntosRecibidos: r[5],
            diferencia: r[6], puntos: r[7], puesto: r[8],
          })));
          setLastUpdated(new Date());
        } else if (!data.success) {
          setError(true);
        }
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, []);

  const medallon = (puesto: string, i: number) => {
    const text = ['1°', '2°', '3°', '4°', '5°', '6°'][i] || puesto;
    const cls = i === 0 ? 'medal-gold' : i === 1 ? 'medal-silver' : i === 2 ? 'medal-bronze' : 'text-text-muted';
    return <span className={`text-lg font-bold ${cls}`}>{text}</span>;
  };

  const toggleExpand = (nombre: string) => {
    setExpandedTeam(prev => prev === nombre ? null : nombre);
  };

  return (
    <section className="p-4 md:p-6 animate-fade-in" aria-label="Tabla de posiciones">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-1 h-5 bg-gold rounded-full" />
        <h2 className="text-sm text-text-muted uppercase tracking-widest">Tabla de posiciones</h2>
        <div className="ml-auto">
          <DataFreshness lastUpdated={lastUpdated} onRefresh={fetchData} loading={loading} />
        </div>
      </div>

      {loading ? (
        <LoadingState message="Cargando posiciones..." variant="skeleton" rows={6} />
      ) : error ? (
        <ErrorState onRetry={fetchData} />
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-bg-header/80 text-[11px] text-text-muted uppercase tracking-wider">
                  <th className="text-left px-4 md:px-5 py-3.5 font-medium w-12">#</th>
                  <th className="text-left px-4 md:px-5 py-3.5 font-medium">Equipo</th>
                  <th className="text-center px-2 py-3.5 font-medium w-12">PJ</th>
                  <th className="text-center px-2 py-3.5 font-medium w-12">PG</th>
                  <th className="text-center px-2 py-3.5 font-medium w-12">PP</th>
                  <th className="text-center px-2 py-3.5 font-medium hidden md:table-cell">P. Ano.</th>
                  <th className="text-center px-2 py-3.5 font-medium hidden md:table-cell">P. Rec.</th>
                  <th className="text-center px-2 py-3.5 font-medium hidden sm:table-cell">Dif.</th>
                  <th className="text-center px-3 py-3.5 font-medium w-14">Pts</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {equipos.map((eq, i) => {
                  const color = getTeamColor(eq.nombre);
                  const white = isWhiteTeam(eq.nombre);
                  const isTop3 = i < 3;
                  const isExpanded = expandedTeam === eq.nombre;
                  const pj = Number(eq.pj) || 1;
                  const pa = Number(eq.puntosAnotados) || 0;
                  const pr = Number(eq.puntosRecibidos) || 0;
                  const ppgOff = (pa / pj).toFixed(1);
                  const ppgDef = (pr / pj).toFixed(1);
                  const ratio = pr > 0 ? (pa / pr).toFixed(2) : '—';
                  const winPct = ((Number(eq.pg) / pj) * 100).toFixed(0);

                  return (
                    <tr key={i} className="border-b border-border-subtle">
                      <td colSpan={10} className="p-0">
                        {/* Main row */}
                        <div
                          className={`flex items-center cursor-pointer table-row-hover transition-colors ${
                            i % 2 === 0 ? 'bg-bg-secondary/50' : 'bg-bg-card/30'
                          }`}
                          onClick={() => toggleExpand(eq.nombre)}
                          role="button"
                          aria-expanded={isExpanded}
                        >
                          <div className="px-4 md:px-5 py-4 w-12">{medallon(eq.puesto, i)}</div>
                          <div className="px-4 md:px-5 py-4 flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-1 h-8 rounded-full shrink-0"
                                style={{
                                  background: white ? '#FFFFFF' : color,
                                  boxShadow: isTop3 ? `0 0 8px ${color}40` : 'none',
                                }}
                              />
                              <span className={`text-sm font-medium ${isTop3 ? 'text-text-primary' : 'text-text-muted'}`}>
                                {eq.nombre}
                              </span>
                            </div>
                          </div>
                          <div className="text-center text-[13px] py-4 w-12">{eq.pj}</div>
                          <div className="text-center text-[13px] py-4 w-12 text-positive font-medium">{eq.pg}</div>
                          <div className="text-center text-[13px] py-4 w-12 text-negative font-medium">{eq.pp}</div>
                          <div className="text-center text-[13px] py-4 hidden md:block w-16">{eq.puntosAnotados}</div>
                          <div className="text-center text-[13px] py-4 hidden md:block w-16">{eq.puntosRecibidos}</div>
                          <div className={`text-center text-[13px] py-4 hidden sm:block w-14 font-medium ${Number(eq.diferencia) >= 0 ? 'text-positive' : 'text-negative'}`}>
                            {Number(eq.diferencia) > 0 ? '+' : ''}{eq.diferencia}
                          </div>
                          <div className="text-center py-4 w-14">
                            <span className={`text-[15px] font-bold ${isTop3 ? 'gradient-text' : 'text-gold'}`}>
                              {eq.puntos}
                            </span>
                          </div>
                          <div className="w-8 flex items-center justify-center">
                            <svg
                              className={`w-4 h-4 text-text-muted transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>

                        {/* Expandable detail */}
                        <div className={`expand-content ${isExpanded ? 'open' : ''}`}>
                          <div>
                            <div className="px-6 py-4 bg-bg-darkest/50 border-t border-border-subtle">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <StatBox label="Prom. Pts/Part." value={ppgOff} color="text-positive" />
                                <StatBox label="Prom. Pts Rec./Part." value={ppgDef} color="text-negative" />
                                <StatBox label="Ratio PF/PC" value={ratio} color="text-gold" />
                                <StatBox label="% Victorias" value={`${winPct}%`} color="text-text-primary" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center p-3 rounded-lg bg-bg-secondary/60 border border-border-subtle">
      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

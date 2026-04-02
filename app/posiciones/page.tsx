'use client';
import { useEffect, useState } from 'react';
import { getTeamColor, isWhiteTeam } from '../lib/constants';
import LoadingState, { ErrorState } from '../components/LoadingState';

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

  return (
    <section className="p-4 md:p-6 animate-fade-in" aria-label="Tabla de posiciones">
      {/* Page title */}
      <div className="flex items-center gap-2 mb-4">
        <span className="w-1 h-5 bg-gold rounded-full" />
        <h2 className="text-sm text-text-muted uppercase tracking-widest">Tabla de posiciones</h2>
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
                </tr>
              </thead>
              <tbody>
                {equipos.map((eq, i) => {
                  const color = getTeamColor(eq.nombre);
                  const white = isWhiteTeam(eq.nombre);
                  const isTop3 = i < 3;
                  return (
                    <tr
                      key={i}
                      className={`border-b border-border-subtle table-row-hover ${
                        i % 2 === 0 ? 'bg-bg-secondary/50' : 'bg-[#1a2744]/50'
                      }`}
                    >
                      <td className="px-4 md:px-5 py-4">{medallon(eq.puesto, i)}</td>
                      <td className="px-4 md:px-5 py-4">
                        <div className="flex items-center gap-3">
                          {/* Team color bar */}
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
                      </td>
                      <td className="text-center text-[13px] py-4">{eq.pj}</td>
                      <td className="text-center text-[13px] py-4 text-positive font-medium">{eq.pg}</td>
                      <td className="text-center text-[13px] py-4 text-negative font-medium">{eq.pp}</td>
                      <td className="text-center text-[13px] py-4 hidden md:table-cell">{eq.puntosAnotados}</td>
                      <td className="text-center text-[13px] py-4 hidden md:table-cell">{eq.puntosRecibidos}</td>
                      <td className={`text-center text-[13px] py-4 hidden sm:table-cell font-medium ${Number(eq.diferencia) >= 0 ? 'text-positive' : 'text-negative'}`}>
                        {Number(eq.diferencia) > 0 ? '+' : ''}{eq.diferencia}
                      </td>
                      <td className="text-center py-4">
                        <span className={`text-[15px] font-bold ${isTop3 ? 'gradient-text' : 'text-gold'}`}>
                          {eq.puntos}
                        </span>
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

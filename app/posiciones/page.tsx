'use client';
import { useEffect, useState } from 'react';
import { getTeamColor, isWhiteTeam } from '../lib/constants';
import LoadingState from '../components/LoadingState';

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

  useEffect(() => {
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
        }
        setLoading(false);
      });
  }, []);

  const medallon = (puesto: string) => {
    const map: Record<string, string> = {
      PRIMERO: '1°', SEGUNDO: '2°', TERCERO: '3°',
      CUARTO: '4°', QUINTO: '5°', SEXTO: '6°',
    };
    return map[puesto] || puesto;
  };

  return (
    <section className="p-4 md:p-6 animate-fade-in" aria-label="Tabla de posiciones">
      {loading ? (
        <LoadingState message="Cargando posiciones..." variant="skeleton" rows={6} />
      ) : (
        <div className="bg-bg-secondary rounded-xl overflow-hidden">
          {/* Desktop table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-bg-header text-[11px] text-text-muted uppercase tracking-wide">
                  <th className="text-left px-4 md:px-5 py-3 font-medium w-10">#</th>
                  <th className="text-left px-4 md:px-5 py-3 font-medium">Equipo</th>
                  <th className="text-center px-2 py-3 font-medium">PJ</th>
                  <th className="text-center px-2 py-3 font-medium">PG</th>
                  <th className="text-center px-2 py-3 font-medium">PP</th>
                  <th className="text-center px-2 py-3 font-medium hidden md:table-cell">P. Ano.</th>
                  <th className="text-center px-2 py-3 font-medium hidden md:table-cell">P. Rec.</th>
                  <th className="text-center px-2 py-3 font-medium hidden sm:table-cell">Dif.</th>
                  <th className="text-center px-2 py-3 font-medium">Pts</th>
                </tr>
              </thead>
              <tbody>
                {equipos.map((eq, i) => {
                  const color = getTeamColor(eq.nombre);
                  const white = isWhiteTeam(eq.nombre);
                  return (
                    <tr
                      key={i}
                      className={`border-b border-border-subtle transition-colors hover:bg-white/[0.03] ${
                        i % 2 === 0 ? 'bg-bg-secondary' : 'bg-[#1a2744]'
                      }`}
                    >
                      <td className="px-4 md:px-5 py-3.5 text-lg">{medallon(eq.puesto)}</td>
                      <td className="px-4 md:px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{
                              background: white ? '#FFFFFF' : color,
                              border: white ? '1px solid #ccc' : 'none',
                            }}
                          />
                          <span className="text-sm font-medium">{eq.nombre}</span>
                        </div>
                      </td>
                      <td className="text-center text-[13px] py-3.5">{eq.pj}</td>
                      <td className="text-center text-[13px] py-3.5 text-positive">{eq.pg}</td>
                      <td className="text-center text-[13px] py-3.5 text-negative">{eq.pp}</td>
                      <td className="text-center text-[13px] py-3.5 hidden md:table-cell">{eq.puntosAnotados}</td>
                      <td className="text-center text-[13px] py-3.5 hidden md:table-cell">{eq.puntosRecibidos}</td>
                      <td className={`text-center text-[13px] py-3.5 hidden sm:table-cell ${Number(eq.diferencia) >= 0 ? 'text-positive' : 'text-negative'}`}>
                        {eq.diferencia}
                      </td>
                      <td className="text-center text-[15px] py-3.5 font-bold text-gold">{eq.puntos}</td>
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

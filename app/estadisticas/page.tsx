'use client';
import { useEffect, useState } from 'react';
import LoadingState from '../components/LoadingState';
import FilterPills from '../components/FilterPills';

interface Jugador {
  nombre: string;
  totalPuntos: string;
  asistencias: string;
  promedio: string;
}

export default function Estadisticas() {
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [maximos, setMaximos] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);
  const [orden, setOrden] = useState<'totalPuntos' | 'asistencias' | 'promedio'>('totalPuntos');

  useEffect(() => {
    fetch('/api/sheets?sheet=PuntosJugadores')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data.length > 1) {
          const rows = data.data.slice(1).filter((r: string[]) => r[7] && r[7] !== 'NOMBRE JUGADOR');
          setJugadores(rows.map((r: string[]) => ({
            nombre: r[7],
            totalPuntos: r[8] || '0',
            asistencias: r[9] || '0',
            promedio: r[10] || '0',
          })));
          const maxRows = data.data.filter((r: string[]) => r[0] && r[0].toString().includes('Jugador'));
          setMaximos(maxRows.map((r: string[]) => [r[0], r[1], r[4]]));
        }
        setLoading(false);
      });
  }, []);

  const ordenados = [...jugadores].sort((a, b) =>
    parseFloat(b[orden]) - parseFloat(a[orden])
  );

  const medalColor = (i: number) => {
    if (i === 0) return 'text-gold';
    if (i === 1) return 'text-[#C0C0C0]';
    if (i === 2) return 'text-[#CD7F32]';
    return 'text-text-muted';
  };

  return (
    <div className="animate-fade-in">
      <div className="px-4 md:px-6 pt-4 flex items-center justify-between">
        <h2 className="text-sm text-text-muted uppercase tracking-widest">
          <span role="img" aria-label="estadísticas">📊</span> Estadísticas
        </h2>
        <span className="text-xs text-text-muted">{jugadores.length} jugadores</span>
      </div>

      <div className="px-4 md:px-6 py-4">
        <FilterPills
          items={[
            { key: 'totalPuntos', label: '🏀 Puntos' },
            { key: 'asistencias', label: '🤝 Asistencias' },
            { key: 'promedio', label: '📈 Promedio' },
          ]}
          active={orden}
          onChange={(key) => setOrden(key as typeof orden)}
        />
      </div>

      <div className="px-4 md:px-6 pb-8">
        {loading ? (
          <LoadingState message="Cargando estadísticas..." variant="skeleton" rows={8} />
        ) : (
          <div className="bg-bg-secondary rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[450px]">
                <thead>
                  <tr className="bg-bg-header text-[11px] text-text-muted uppercase tracking-wide">
                    <th className="text-left px-4 md:px-5 py-3 font-medium w-12">#</th>
                    <th className="text-left px-4 md:px-5 py-3 font-medium">Jugador</th>
                    <th className="text-center px-3 py-3 font-medium">Puntos</th>
                    <th className="text-center px-3 py-3 font-medium hidden sm:table-cell">Asistencias</th>
                    <th className="text-center px-3 py-3 font-medium hidden sm:table-cell">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenados.map((j, i) => (
                    <tr
                      key={i}
                      className={`border-b border-border-subtle transition-colors hover:bg-white/[0.03] ${
                        i % 2 === 0 ? 'bg-bg-secondary' : 'bg-[#1a2744]'
                      }`}
                    >
                      <td className={`px-4 md:px-5 py-3 text-sm font-bold ${medalColor(i)}`}>
                        {i + 1}°
                      </td>
                      <td className="px-4 md:px-5 py-3 text-[13px] font-medium">{j.nombre}</td>
                      <td className={`text-center py-3 text-sm font-bold ${orden === 'totalPuntos' ? 'text-gold' : 'text-text-primary'}`}>
                        {j.totalPuntos}
                      </td>
                      <td className={`text-center py-3 text-sm hidden sm:table-cell ${orden === 'asistencias' ? 'font-bold text-gold' : ''}`}>
                        {j.asistencias}
                      </td>
                      <td className={`text-center py-3 text-sm hidden sm:table-cell ${orden === 'promedio' ? 'font-bold text-gold' : ''}`}>
                        {j.promedio}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Top scorers section */}
      {maximos.length > 0 && (
        <section className="px-4 md:px-6 pb-8" aria-label="Jugadores con máximos puntos">
          <div className="bg-bg-secondary rounded-xl p-5">
            <h3 className="text-sm text-text-muted uppercase tracking-widest mb-4">
              <span role="img" aria-label="trofeo">🏆</span> Jugadores con máximos puntos
            </h3>
            {maximos.map((r, i) => (
              <div
                key={i}
                className="flex justify-between items-center py-2.5 border-b border-border-subtle last:border-b-0"
              >
                <span className="text-[13px] text-text-muted">{r[0]}</span>
                <div className="flex gap-5 items-center">
                  <span className="text-[15px] font-bold text-text-primary">{r[1]}</span>
                  <span className="text-base font-bold text-gold min-w-[50px] text-right">{r[2]}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

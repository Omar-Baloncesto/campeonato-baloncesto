'use client';
import { useEffect, useState } from 'react';
import LoadingState, { ErrorState } from '../components/LoadingState';
import FilterPills from '../components/FilterPills';
import DataFreshness from '../components/DataFreshness';

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
  const [error, setError] = useState(false);
  const [orden, setOrden] = useState<'totalPuntos' | 'asistencias' | 'promedio'>('totalPuntos');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = () => {
    setLoading(true);
    setError(false);
    fetch('/api/sheets?sheet=PuntosJugadores')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data.length > 1) {
          const rows = data.data.slice(1).filter((r: string[]) => r[7] && r[7] !== 'NOMBRE JUGADOR');
          setJugadores(rows.map((r: string[]) => ({
            nombre: r[7], totalPuntos: r[8] || '0', asistencias: r[9] || '0', promedio: r[10] || '0',
          })));
          const maxRows = data.data.filter((r: string[]) => r[0] && r[0].toString().includes('Jugador'));
          setMaximos(maxRows.map((r: string[]) => [r[0], r[1], r[4]]));
          setLastUpdated(new Date());
        } else if (!data.success) setError(true);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, []);

  const ordenados = [...jugadores].sort((a, b) => parseFloat(b[orden]) - parseFloat(a[orden]));

  const medalClass = (i: number) =>
    i === 0 ? 'medal-gold' : i === 1 ? 'medal-silver' : i === 2 ? 'medal-bronze' : 'text-text-muted';

  return (
    <div className="animate-fade-in">
      <div className="px-4 md:px-6 pt-4 flex items-center justify-between">
        <h2 className="text-sm text-text-muted uppercase tracking-widest flex items-center gap-2">
          <span className="w-1 h-4 bg-gold rounded-full" />
          Estadisticas
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted">{jugadores.length} jugadores</span>
          <DataFreshness lastUpdated={lastUpdated} onRefresh={fetchData} loading={loading} />
        </div>
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
          <LoadingState message="Cargando estadisticas..." variant="skeleton" rows={8} />
        ) : error ? (
          <ErrorState onRetry={fetchData} />
        ) : (
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="bg-bg-header/80 text-[11px] text-text-muted uppercase tracking-wider">
                    <th className="text-left px-4 md:px-5 py-3.5 font-medium w-12">#</th>
                    <th className="text-left px-4 md:px-5 py-3.5 font-medium">Jugador</th>
                    <th className="text-center px-3 py-3.5 font-medium">Puntos</th>
                    <th className="text-center px-3 py-3.5 font-medium">Asistencias</th>
                    <th className="text-center px-3 py-3.5 font-medium">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenados.map((j, i) => (
                    <tr
                      key={i}
                      className={`border-b border-border-subtle table-row-hover ${
                        i % 2 === 0 ? 'bg-bg-secondary/50' : 'bg-[#1a2744]/50'
                      }`}
                    >
                      <td className={`px-4 md:px-5 py-3.5 text-sm font-bold ${medalClass(i)}`}>
                        {i + 1}°
                      </td>
                      <td className="px-4 md:px-5 py-3.5 text-[13px] font-medium">{j.nombre}</td>
                      <td className={`text-center py-3.5 text-sm font-bold ${orden === 'totalPuntos' ? 'gradient-text' : 'text-text-primary'}`}>
                        {j.totalPuntos}
                      </td>
                      <td className={`text-center px-3 py-3.5 text-sm ${orden === 'asistencias' ? 'font-bold gradient-text' : ''}`}>
                        {j.asistencias}
                      </td>
                      <td className={`text-center px-3 py-3.5 text-sm ${orden === 'promedio' ? 'font-bold gradient-text' : ''}`}>
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

      {maximos.length > 0 && (
        <section className="px-4 md:px-6 pb-8" aria-label="Jugadores con maximos puntos">
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm text-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="text-lg">🏆</span> Jugadores con maximos puntos
            </h3>
            {maximos.map((r, i) => (
              <div
                key={i}
                className="flex justify-between items-center py-3 border-b border-border-subtle last:border-b-0 hover:bg-white/[0.02] transition-colors px-2 -mx-2 rounded"
              >
                <span className="text-[13px] text-text-muted">{r[0]}</span>
                <div className="flex gap-5 items-center">
                  <span className="text-[15px] font-bold text-text-primary">{r[1]}</span>
                  <span className="text-base font-bold gradient-text min-w-[50px] text-right">{r[2]}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

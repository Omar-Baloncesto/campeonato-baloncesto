'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LoadingState, { ErrorState } from '../components/LoadingState';
import FilterPills from '../components/FilterPills';
import DataFreshness from '../components/DataFreshness';
import SearchInput from '../components/SearchInput';
import { normalizeText } from '../lib/utils';

interface Jugador {
  nombre: string;
  totalPuntos: string;
  asistencias: string;
  promedio: string;
}

interface MaximoRow {
  label: string;
  jugadores: string[];
  valor: number;
}

export default function Estadisticas() {
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [maximos, setMaximos] = useState<MaximoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [orden, setOrden] = useState<'totalPuntos' | 'asistencias' | 'promedio'>('totalPuntos');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    setLoading(true);
    setError(false);
    fetch('/api/sheets?sheet=PuntosJugadores', { signal })
      .then(r => r.json())
      .then(data => {
        if (signal.aborted) return;
        if (data.success && Array.isArray(data.data) && data.data.length > 1) {
          const rows = data.data.slice(1).filter((r: string[]) => {
            const name = r[7]?.toString().trim();
            return name && name !== 'NOMBRE JUGADOR' && name.toUpperCase() !== 'JUGADOR';
          });
          setJugadores(rows.map((r: string[]) => ({
            nombre: r[7]?.toString().trim() ?? '', totalPuntos: r[8] || '0', asistencias: r[9] || '0', promedio: r[10] || '0',
          })));
          // Calculate maximos from raw player rows (cols 0-4: nombre, p1, p2, p3, total)
          // Player rows are identified by having a name in r[0] and a numeric value in r[1]
          const playerDataRows = (data.data as string[][]).filter(r => {
            const name = r[0]?.toString().trim();
            return name && !isNaN(parseFloat(r[1]));
          });
          const calcMax = (col: number, label: string): MaximoRow => {
            const max = Math.max(0, ...playerDataRows.map(r => parseFloat(r[col]) || 0));
            const jugadores = max > 0
              ? playerDataRows
                  .filter(r => (parseFloat(r[col]) || 0) === max)
                  .map(r => r[0].trim())
              : [];
            return { label, jugadores, valor: max };
          };
          setMaximos([
            calcMax(1, 'Jugador con más puntos de 1'),
            calcMax(2, 'Jugador con más puntos de 2'),
            calcMax(3, 'Jugador con más puntos de 3'),
            calcMax(4, 'Jugador con más puntos totales'),
          ].filter(m => m.jugadores.length > 0));
          setLastUpdated(new Date());
        } else if (!data.success) setError(true);
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

  const ordenados = useMemo(() => {
    const norm = normalizeText(searchTerm);
    return [...jugadores]
      .filter((j) => j.nombre && (!searchTerm || normalizeText(j.nombre).includes(norm)))
      .sort((a, b) => parseFloat(b[orden]) - parseFloat(a[orden]));
  }, [jugadores, orden, searchTerm]);

  const medalClass = (i: number) =>
    i === 0 ? 'medal-gold' : i === 1 ? 'medal-silver' : i === 2 ? 'medal-bronze' : 'text-text-muted';

  return (
    <div className="animate-fade-in">
      <div className="px-4 md:px-6 pt-4 flex items-center justify-between">
        <h2 className="text-sm text-text-muted uppercase tracking-widest flex items-center gap-2">
          <span className="w-1 h-4 bg-gold rounded-full" />
          Estadísticas
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

      <div className="px-4 md:px-6 pb-2">
        <SearchInput value={searchTerm} onChange={setSearchTerm} />
      </div>

      <div className="px-4 md:px-6 pb-8">
        {loading ? (
          <LoadingState message="Cargando estadísticas..." variant="skeleton" rows={8} />
        ) : error ? (
          <ErrorState onRetry={fetchData} />
        ) : (
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="bg-bg-header text-[12px] uppercase tracking-wider" style={{ color: '#ffffff' }}>
                    <th className="text-center px-4 md:px-5 py-3.5 font-bold w-12">#</th>
                    <th className="text-center px-4 md:px-5 py-3.5 font-bold text-[14px]">Jugador</th>
                    <th className="text-center px-3 py-3.5 font-bold">Puntos</th>
                    <th className="text-center px-3 py-3.5 font-bold">Asistencias</th>
                    <th className="text-center px-3 py-3.5 font-bold">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenados.map((j, i) => (
                    <tr
                      key={`${j.nombre}-${i}`}
                      className={`border-b border-border-subtle table-row-hover ${
                        i % 2 === 0 ? 'bg-bg-secondary/50' : 'bg-bg-card/50'
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
        <section className="px-4 md:px-6 pb-8" aria-label="Jugadores con máximos puntos">
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="p-5 pb-2">
              <h3 className="text-sm text-text-primary font-semibold uppercase tracking-widest flex items-center gap-2">
                <span className="text-lg">🏆</span> Jugadores con máximos puntos
              </h3>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[480px] px-5 pb-3">
                {maximos.map((m) => (
                  <div
                    key={m.label}
                    className="py-3 border-b border-border-subtle last:border-b-0"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-[13px] text-text-primary">{m.label}</span>
                      <span className="text-base font-bold gradient-text shrink-0">{m.valor}</span>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {m.jugadores.map((nombre) => (
                        <div key={`${m.label}-${nombre}`} className="text-[12px] font-semibold text-text-primary">{nombre}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

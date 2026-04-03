'use client';
import { useEffect, useState } from 'react';
import { TEAMS } from '../lib/constants';
import LoadingState, { ErrorState } from '../components/LoadingState';
import FilterPills from '../components/FilterPills';
import DataFreshness from '../components/DataFreshness';
import SearchInput from '../components/SearchInput';
import { normalizeText } from '../lib/utils';

interface Jugador {
  id: string;
  nombre: string;
  equipoId: string;
  numero: string;
  posicion: string;
}

export default function Jugadores() {
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [equipoFiltro, setEquipoFiltro] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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
              return (
                <div
                  key={j.id}
                  className="glass-card rounded-xl p-4 flex items-center gap-3.5 glow-hover group"
                  style={{ borderColor: color + '15' }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-base shrink-0 transition-transform group-hover:scale-105"
                    style={{
                      background: isWhite ? '#FFFFFF' : `linear-gradient(135deg, ${color}30, ${color}10)`,
                      border: `2px solid ${color}50`,
                      color: isWhite ? '#000000' : color,
                      boxShadow: `0 2px 10px ${color}15`,
                    }}
                  >
                    {j.numero || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium leading-tight truncate">{j.nombre}</div>
                    <div className="text-[11px] mt-1 font-medium" style={{ color }}>{team?.name || `Equipo ${j.equipoId}`}</div>
                    <div className="text-[10px] text-text-muted/70 mt-0.5">{j.posicion}</div>
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

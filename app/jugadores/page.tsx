'use client';
import { useEffect, useState } from 'react';
import { TEAMS } from '../lib/constants';
import LoadingState from '../components/LoadingState';
import FilterPills from '../components/FilterPills';

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

  useEffect(() => {
    fetch('/api/sheets?sheet=JUGADORES')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data.length > 1) {
          const rows = data.data.slice(1).filter((r: string[]) => r[1]);
          setJugadores(rows.map((r: string[]) => ({
            id: r[0], nombre: r[1], equipoId: r[2],
            numero: r[3], posicion: r[4],
          })));
        }
        setLoading(false);
      });
  }, []);

  const filtrados = equipoFiltro === 'Todos'
    ? [...jugadores].sort((a, b) => Number(a.equipoId) - Number(b.equipoId))
    : jugadores.filter(j => j.equipoId === equipoFiltro);

  const filterItems = [
    { key: 'Todos', label: 'Todos', color: '#F5B800' },
    ...Object.entries(TEAMS).map(([id, t]) => ({
      key: id,
      label: t.name,
      color: t.safeColor,
    })),
  ];

  return (
    <div className="animate-fade-in">
      <div className="px-4 md:px-6 pt-4 flex items-center justify-between">
        <h2 className="text-sm text-text-muted uppercase tracking-widest">
          <span role="img" aria-label="jugadores">👤</span> Jugadores
        </h2>
        <span className="text-xs text-text-muted">{filtrados.length} jugadores</span>
      </div>

      <div className="px-4 md:px-6 py-4">
        <FilterPills
          items={filterItems}
          active={equipoFiltro}
          onChange={setEquipoFiltro}
          variant="outline"
        />
      </div>

      <div className="px-4 md:px-6 pb-8">
        {loading ? (
          <LoadingState message="Cargando jugadores..." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtrados.map(j => {
              const team = TEAMS[j.equipoId];
              const color = team?.safeColor || '#888';
              const isWhite = team?.color === '#FFFFFF';
              return (
                <div
                  key={j.id}
                  className="bg-bg-secondary rounded-xl p-4 border border-border-light flex items-center gap-3 transition-all duration-150 hover:border-gold/15 hover:-translate-y-0.5"
                  style={{ borderColor: color + '20' }}
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-base shrink-0"
                    style={{
                      background: isWhite ? '#FFFFFF' : color + '25',
                      border: `2px solid ${color}60`,
                      color: isWhite ? '#000000' : color,
                    }}
                  >
                    {j.numero || '?'}
                  </div>
                  <div>
                    <div className="text-[13px] font-medium leading-tight">{j.nombre}</div>
                    <div className="text-[11px] mt-0.5" style={{ color }}>{team?.name || `Equipo ${j.equipoId}`}</div>
                    <div className="text-[10px] text-text-muted">{j.posicion}</div>
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

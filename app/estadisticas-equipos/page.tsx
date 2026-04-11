'use client';
import { useEffect, useState } from 'react';
import { getTeamColor, isWhiteTeam } from '../lib/constants';
import LoadingState, { ErrorState } from '../components/LoadingState';
import FilterPills from '../components/FilterPills';

interface JugadorEquipo {
  nombre: string;
  p1: string;
  p2: string;
  p3: string;
  total: string;
}

interface Equipo {
  nombre: string;
  color: string;
  jugadores: JugadorEquipo[];
}

const EQUIPOS_CONFIG = [
  { nombre: 'Miami Heat', color: '#FFFFFF', filaInicio: 2, filaFin: 12 },
  { nombre: 'Brooklyn Nets', color: '#AAAAAA', filaInicio: 16, filaFin: 25 },
  { nombre: 'Boston Celtics', color: '#22c55e', filaInicio: 30, filaFin: 40 },
  { nombre: 'Oklahoma City Thunder', color: '#00BFFF', filaInicio: 44, filaFin: 53 },
  { nombre: 'Los Angeles Lakers', color: '#FFD700', filaInicio: 58, filaFin: 68 },
  { nombre: 'Toronto Raptors', color: '#FF0000', filaInicio: 72, filaFin: 81 },
];

export default function EstadisticasEquipos() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [equipoActivo, setEquipoActivo] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sheets?sheet=PuntosJugadores')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data.length > 1) {
          const rows = data.data;
          const result = EQUIPOS_CONFIG.map(eq => ({
            nombre: eq.nombre,
            color: eq.color,
            jugadores: rows
              .slice(eq.filaInicio - 1, eq.filaFin)
              .filter((r: string[]) => r[0] && r[0] !== eq.nombre && !r[0].toLowerCase().startsWith('equipo'))
              .map((r: string[]) => ({
                nombre: r[0], p1: r[1] || '0',
                p2: r[2] || '0', p3: r[3] || '0', total: r[4] || '0',
              }))
          }));
          setEquipos(result);
        }
        setLoading(false);
      });
  }, []);

  const eq = equipos[equipoActivo];

  return (
    <div className="animate-fade-in">
      <div className="px-4 md:px-6 pt-4">
        <h2 className="text-sm text-text-muted uppercase tracking-widest flex items-center gap-2">
          <span className="w-1 h-4 bg-gold rounded-full" />
          Estadísticas por equipo
        </h2>
      </div>

      <div className="px-4 md:px-6 py-4">
        <FilterPills
          items={equipos.map((e, i) => ({
            key: String(i),
            label: e.nombre,
            color: getTeamColor(e.nombre),
          }))}
          active={String(equipoActivo)}
          onChange={(key) => setEquipoActivo(Number(key))}
          variant="outline"
        />
      </div>

      <div className="px-4 md:px-6 pb-8">
        {loading ? (
          <LoadingState message="Cargando estadísticas..." variant="skeleton" />
        ) : eq ? (
          <div className="glass-card rounded-xl overflow-hidden">
            {/* Team header */}
            <div
              className="px-5 py-4 flex items-center gap-2.5"
              style={{
                background: isWhiteTeam(eq.nombre) ? '#FFFFFF' : getTeamColor(eq.nombre) + '20',
                borderBottom: `2px solid ${getTeamColor(eq.nombre)}`,
              }}
            >
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{
                  background: getTeamColor(eq.nombre),
                  outline: isWhiteTeam(eq.nombre) ? '1.5px solid #CCCCCC' : 'none',
                }}
              />
              <span
                className="font-bold text-base"
                style={{ color: isWhiteTeam(eq.nombre) ? '#111111' : 'var(--color-text-primary)' }}
              >
                {eq.nombre}
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="bg-bg-header text-[12px] uppercase tracking-wide font-bold" style={{ color: '#ffffff' }}>
                    <th className="text-left px-5 py-2.5 font-medium">Jugador</th>
                    <th className="text-center px-3 py-2.5 font-medium w-24">Puntos de 1</th>
                    <th className="text-center px-3 py-2.5 font-medium w-24">Puntos de 2</th>
                    <th className="text-center px-3 py-2.5 font-medium w-24">Puntos de 3</th>
                    <th className="text-center px-3 py-2.5 font-medium w-24">Total Puntos</th>
                  </tr>
                </thead>
                <tbody>
                  {eq.jugadores.map((j, i) => (
                    <tr
                      key={i}
                      className={`border-b border-border-subtle table-row-hover ${
                        i % 2 === 0 ? 'bg-bg-secondary' : 'bg-bg-card'
                      }`}
                    >
                      <td className="px-5 py-3 text-[13px] font-medium">{j.nombre}</td>
                      <td className="text-center py-3 text-[13px]">{j.p1}</td>
                      <td className="text-center py-3 text-[13px]">{j.p2}</td>
                      <td className="text-center py-3 text-[13px]">{j.p3}</td>
                      <td className="text-center py-3 text-sm font-bold text-gold">{j.total}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-bg-header">
                    <td className="px-5 py-3.5 text-[13px] font-bold text-gold">TOTAL EQUIPO</td>
                    {(['p1', 'p2', 'p3', 'total'] as const).map(key => (
                      <td key={key} className="text-center py-3.5 text-sm font-bold text-gold">
                        {eq.jugadores.reduce((sum, j) => sum + (parseInt(j[key]) || 0), 0)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

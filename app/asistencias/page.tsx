'use client';
import { useEffect, useState } from 'react';
import { getTeamColor, isWhiteTeam } from '../lib/constants';
import LoadingState, { ErrorState } from '../components/LoadingState';
import FilterPills from '../components/FilterPills';

interface Jugador {
  nombre: string;
  fechas: string[];
  asistencia: string;
  totalFechas: string;
  fraccion: string;
  porcentaje: string;
}

interface Equipo {
  nombre: string;
  color: string;
  jugadores: Jugador[];
}

const FECHAS = ['21/02', '28/02', '7/03', '14/03', '26/03', '11/04', '18/04', '25/04', '2/05', '9/05'];

const EQUIPOS_NOMBRES = [
  'Miami Heat',
  'Brooklyn Nets',
  'Boston Celtics',
  'Oklahoma City Thunder',
  'Los Angeles Lakers',
  'Toronto Raptors',
];

export default function Asistencias() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [equipoActivo, setEquipoActivo] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sheets?sheet=AsistenciasJugadores')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data.length > 1) {
          const rows: string[][] = data.data;
          // Find team title rows dynamically
          const titleIndices: number[] = [];
          rows.forEach((r, i) => {
            if (r[0] && r[0].trim().toLowerCase().startsWith('equipo')) {
              titleIndices.push(i);
            }
          });
          const result = EQUIPOS_NOMBRES.map((nombre, teamIdx) => {
            const titleIdx = titleIndices[teamIdx];
            if (titleIdx == null) return { nombre, color: '', jugadores: [] };
            const nextTitle = titleIndices[teamIdx + 1] ?? rows.length;
            const blockRows = rows.slice(titleIdx + 1, nextTitle);
            const jugadores = blockRows
              .filter((r: string[]) => {
                const name = (r[0] || '').trim();
                if (name === '') return false;
                const lower = name.toLowerCase();
                return !lower.startsWith('equipo') && lower !== 'jugador';
              })
              .map((r: string[]) => ({
                nombre: r[0],
                fechas: [r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10]],
                asistencia: r[11] || '0',
                totalFechas: r[12] || '0',
                fraccion: r[13] || '0/0',
                porcentaje: r[14] || '0%',
              }));
            return { nombre, color: '', jugadores };
          });
          setEquipos(result);
        }
        setLoading(false);
      });
  }, []);

  const eq = equipos[equipoActivo];
  const color = eq ? getTeamColor(eq.nombre) : '#888';

  const pctColor = (pct: string) => {
    const n = parseFloat(pct);
    if (n >= 80) return 'text-positive';
    if (n >= 50) return 'text-gold';
    return 'text-negative';
  };

  return (
    <div className="animate-fade-in">
      <div className="px-4 md:px-6 pt-4">
        <h2 className="text-sm text-text-muted uppercase tracking-widest flex items-center gap-2">
          <span className="w-1 h-4 bg-gold rounded-full" />
          Asistencias
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
          <LoadingState message="Cargando asistencias..." variant="skeleton" rows={8} />
        ) : eq ? (
          <>
            {/* Mobile: card layout */}
            <div className="lg:hidden space-y-3">
              <div
                className="px-4 py-3 rounded-t-xl flex items-center gap-2.5"
                style={{
                  background: isWhiteTeam(eq.nombre) ? '#FFFFFF' : color + '20',
                  borderBottom: `2px solid ${color}`,
                }}
              >
                <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                <span className="font-bold" style={{ color: isWhiteTeam(eq.nombre) ? '#000000' : color }}>
                  {eq.nombre}
                </span>
              </div>
              {eq.jugadores.map((j, i) => (
                <div
                  key={i}
                  className="bg-bg-secondary rounded-xl p-4 border border-border-light"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">{j.nombre}</span>
                    <span className={`text-sm font-bold ${pctColor(j.porcentaje)}`}>
                      {j.porcentaje}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>Asistencia: {j.fraccion}</span>
                    <span>{j.asistencia} de {j.totalFechas} fechas</span>
                  </div>
                  {/* Mini attendance dots */}
                  <div className="flex gap-1.5 mt-3">
                    {j.fechas.map((f, fi) => (
                      <div
                        key={fi}
                        className={`w-5 h-5 rounded text-[10px] flex items-center justify-center font-medium ${
                          f === '1' ? 'bg-positive/20 text-positive' :
                          f === '0' && fi < 5 ? 'bg-negative/20 text-negative' :
                          'bg-bg-darkest/50 text-text-muted'
                        }`}
                      >
                        {f === '1' ? '✓' : f === '0' && fi < 5 ? '✗' : ''}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: full table */}
            <div className="hidden lg:block overflow-x-auto">
              <div className="bg-bg-secondary rounded-xl overflow-hidden min-w-[900px]">
                <div
                  className="px-5 py-4 flex items-center gap-2.5"
                  style={{
                    background: isWhiteTeam(eq.nombre) ? '#FFFFFF' : color + '20',
                    borderBottom: `2px solid ${color}`,
                  }}
                >
                  <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                  <span className="font-bold text-base" style={{ color: isWhiteTeam(eq.nombre) ? '#000000' : color }}>
                    {eq.nombre}
                  </span>
                </div>

                <table className="w-full">
                  <thead>
                    <tr className="bg-bg-header text-[10px] text-text-muted uppercase tracking-wide">
                      <th className="text-left px-4 py-2.5 font-medium w-[160px]">Jugador</th>
                      {FECHAS.map(f => (
                        <th key={f} className="text-center px-1 py-2.5 font-medium w-[50px]">{f}</th>
                      ))}
                      <th className="text-center px-1 py-2.5 font-medium w-[55px]">Asist.</th>
                      <th className="text-center px-1 py-2.5 font-medium w-[55px]">Fechas</th>
                      <th className="text-center px-1 py-2.5 font-medium w-[65px]">Fracc.</th>
                      <th className="text-center px-1 py-2.5 font-medium w-[55px]">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eq.jugadores.map((j, i) => (
                      <tr
                        key={i}
                        className={`border-b border-border-subtle transition-colors hover:bg-white/[0.03] ${
                          i % 2 === 0 ? 'bg-bg-secondary' : 'bg-bg-card'
                        }`}
                      >
                        <td className="px-4 py-2.5 text-xs font-medium">{j.nombre}</td>
                        {j.fechas.map((f, fi) => (
                          <td key={fi} className="text-center py-2.5">
                            <span className={`text-sm ${
                              f === '1' ? 'text-positive' :
                              f === '0' && fi < 5 ? 'text-negative' :
                              'text-text-muted'
                            }`}>
                              {f === '1' ? '✓' : f === '0' && fi < 5 ? '✗' : ''}
                            </span>
                          </td>
                        ))}
                        <td className="text-center py-2.5 text-xs">{j.asistencia}</td>
                        <td className="text-center py-2.5 text-xs">{j.totalFechas}</td>
                        <td className="text-center py-2.5 text-xs">{j.fraccion}</td>
                        <td className={`text-center py-2.5 text-xs font-bold ${pctColor(j.porcentaje)}`}>
                          {j.porcentaje}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

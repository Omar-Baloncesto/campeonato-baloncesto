'use client';
import { useEffect, useState } from 'react';
import { getTeamColor, isWhiteTeam } from '../lib/constants';
import LoadingState, { ErrorState } from '../components/LoadingState';
import FilterPills from '../components/FilterPills';
import DataFreshness from '../components/DataFreshness';

const FECHAS_LABELS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10'];
const FECHAS_FULL = ['21/02', '28/02', '7/03', '14/03', '26/03', '11/04', '18/04', '25/04', '2/05', '9/05'];

const EQUIPOS_CONFIG = [
  { nombre: 'Miami Heat', filaInicio: 2, filaFin: 12 },
  { nombre: 'Brooklyn Nets', filaInicio: 16, filaFin: 25 },
  { nombre: 'Boston Celtics', filaInicio: 30, filaFin: 40 },
  { nombre: 'Oklahoma City Thunder', filaInicio: 44, filaFin: 53 },
  { nombre: 'Los Angeles Lakers', filaInicio: 58, filaFin: 68 },
  { nombre: 'Toronto Raptors', filaInicio: 72, filaFin: 81 },
];

interface JugadorDetalle {
  nombre: string;
  fechas: { p1: number; p2: number; p3: number }[];
  totalP1: number;
  totalP2: number;
  totalP3: number;
  total: number;
}

interface EquipoData {
  nombre: string;
  jugadores: JugadorDetalle[];
}

const FECHA_COLORS = [
  'bg-emerald-900/30',
  'bg-blue-900/30',
  'bg-amber-900/30',
  'bg-pink-900/30',
  'bg-purple-900/30',
  'bg-cyan-900/30',
  'bg-lime-900/30',
  'bg-orange-900/30',
  'bg-indigo-900/30',
  'bg-rose-900/30',
];

const FECHA_HEADER_COLORS = [
  'bg-emerald-800/60',
  'bg-blue-800/60',
  'bg-amber-800/60',
  'bg-pink-800/60',
  'bg-purple-800/60',
  'bg-cyan-800/60',
  'bg-lime-800/60',
  'bg-orange-800/60',
  'bg-indigo-800/60',
  'bg-rose-800/60',
];

export default function EstadisticaJugadores() {
  const [equipos, setEquipos] = useState<EquipoData[]>([]);
  const [equipoActivo, setEquipoActivo] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [numFechas, setNumFechas] = useState(0);

  const fetchData = () => {
    setLoading(true);
    setError(false);
    fetch('/api/sheets?sheet=PuntosJugadores&range=A:AZ')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data.length > 1) {
          const rows: string[][] = data.data;

          // Detect how many date columns exist (cols 5+ in groups of 3)
          // Look at the first player row from the first team to count non-empty date cols
          const sampleTeam = EQUIPOS_CONFIG[0];
          const sampleRows = rows.slice(sampleTeam.filaInicio - 1, sampleTeam.filaFin)
            .filter((r) => r[0] && !r[0].toLowerCase().startsWith('equipo') && r[0] !== sampleTeam.nombre);

          let detectedFechas = 0;
          if (sampleRows.length > 0) {
            // Count groups of 3 columns starting from col 5
            for (let f = 0; f < 10; f++) {
              const colBase = 5 + f * 3;
              // Check if any player in this team has data in this date group
              const hasData = sampleRows.some(r =>
                (r[colBase] && r[colBase] !== '0' && r[colBase] !== '') ||
                (r[colBase + 1] && r[colBase + 1] !== '0' && r[colBase + 1] !== '') ||
                (r[colBase + 2] && r[colBase + 2] !== '0' && r[colBase + 2] !== '')
              );
              if (hasData) {
                detectedFechas = f + 1;
              }
            }
            // If no per-date data found in cols 5+, check if there are at least columns beyond 4
            if (detectedFechas === 0) {
              const maxCols = Math.max(...rows.slice(0, 85).map(r => r.length));
              if (maxCols > 5) {
                detectedFechas = Math.min(10, Math.floor((maxCols - 5) / 3));
              }
            }
          }
          setNumFechas(detectedFechas);

          const result = EQUIPOS_CONFIG.map(eq => {
            const teamRows = rows
              .slice(eq.filaInicio - 1, eq.filaFin)
              .filter((r) => r[0] && r[0] !== eq.nombre && !r[0].toLowerCase().startsWith('equipo'));

            const jugadores: JugadorDetalle[] = teamRows.map(r => {
              const fechas: { p1: number; p2: number; p3: number }[] = [];
              for (let f = 0; f < Math.max(detectedFechas, 10); f++) {
                const colBase = 5 + f * 3;
                fechas.push({
                  p1: parseInt(r[colBase]) || 0,
                  p2: parseInt(r[colBase + 1]) || 0,
                  p3: parseInt(r[colBase + 2]) || 0,
                });
              }
              return {
                nombre: r[0],
                totalP1: parseInt(r[1]) || 0,
                totalP2: parseInt(r[2]) || 0,
                totalP3: parseInt(r[3]) || 0,
                total: parseInt(r[4]) || 0,
                fechas,
              };
            });

            return { nombre: eq.nombre, jugadores };
          });

          setEquipos(result);
          setLastUpdated(new Date());
        } else if (!data.success) {
          setError(true);
        }
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, []);

  const eq = equipos[equipoActivo];

  // Determine which dates to show (those with any data across all teams)
  const activeFechas: number[] = [];
  if (eq) {
    for (let f = 0; f < 10; f++) {
      const hasData = equipos.some(team =>
        team.jugadores.some(j => j.fechas[f] && (j.fechas[f].p1 > 0 || j.fechas[f].p2 > 0 || j.fechas[f].p3 > 0))
      );
      if (hasData) activeFechas.push(f);
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="px-4 md:px-6 pt-4 flex items-center justify-between">
        <h2 className="text-sm text-text-muted uppercase tracking-widest flex items-center gap-2">
          <span className="w-1 h-4 bg-gold rounded-full" />
          Estadística Jugadores
        </h2>
        <DataFreshness lastUpdated={lastUpdated} onRefresh={fetchData} loading={loading} />
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
          <LoadingState message="Cargando estadísticas de jugadores..." variant="skeleton" rows={8} />
        ) : error ? (
          <ErrorState onRetry={fetchData} />
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
              <span className="text-xs text-text-muted ml-2">
                {eq.jugadores.length} jugadores
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]" style={{ minWidth: activeFechas.length > 0 ? `${400 + activeFechas.length * 120}px` : '500px' }}>
                <thead>
                  {/* Top header row with date groups */}
                  <tr className="bg-bg-header text-[11px] uppercase tracking-wide font-bold" style={{ color: '#ffffff' }}>
                    <th className="text-left px-3 py-2 font-medium sticky left-0 bg-bg-header z-10" rowSpan={2}>
                      Jugador
                    </th>
                    {activeFechas.map(f => (
                      <th
                        key={`fecha-${f}`}
                        colSpan={3}
                        className={`text-center px-1 py-1.5 font-medium border-l border-white/10 ${FECHA_HEADER_COLORS[f % FECHA_HEADER_COLORS.length]}`}
                        title={FECHAS_FULL[f]}
                      >
                        {FECHAS_LABELS[f]}
                        <div className="text-[9px] font-normal opacity-70">{FECHAS_FULL[f]}</div>
                      </th>
                    ))}
                    <th colSpan={3} className="text-center px-1 py-1.5 font-medium border-l border-white/20 bg-bg-header">
                      Σ Totales
                    </th>
                    <th className="text-center px-2 py-1.5 font-bold border-l border-white/20 bg-bg-header" rowSpan={2}>
                      Total
                    </th>
                  </tr>
                  {/* Sub-header with P1/P2/P3 labels */}
                  <tr className="bg-bg-header/90 text-[10px] uppercase tracking-wide" style={{ color: '#ffffffcc' }}>
                    {activeFechas.map(f => (
                      [
                        <th key={`f${f}-p1`} className={`text-center px-1 py-1 border-l border-white/10 ${FECHA_HEADER_COLORS[f % FECHA_HEADER_COLORS.length]}`}>P1</th>,
                        <th key={`f${f}-p2`} className={`text-center px-1 py-1 ${FECHA_HEADER_COLORS[f % FECHA_HEADER_COLORS.length]}`}>P2</th>,
                        <th key={`f${f}-p3`} className={`text-center px-1 py-1 ${FECHA_HEADER_COLORS[f % FECHA_HEADER_COLORS.length]}`}>P3</th>,
                      ]
                    ))}
                    <th className="text-center px-1 py-1 border-l border-white/20">P1</th>
                    <th className="text-center px-1 py-1">P2</th>
                    <th className="text-center px-1 py-1">P3</th>
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
                      <td className="px-3 py-2.5 font-medium text-[13px] sticky left-0 z-10" style={{ background: 'inherit' }}>
                        {j.nombre}
                      </td>
                      {activeFechas.map(f => {
                        const d = j.fechas[f] || { p1: 0, p2: 0, p3: 0 };
                        return [
                          <td key={`f${f}-p1`} className={`text-center px-1 py-2.5 border-l border-border-subtle ${FECHA_COLORS[f % FECHA_COLORS.length]}`}>
                            {d.p1 || <span className="text-text-muted/30">-</span>}
                          </td>,
                          <td key={`f${f}-p2`} className={`text-center px-1 py-2.5 ${FECHA_COLORS[f % FECHA_COLORS.length]}`}>
                            {d.p2 || <span className="text-text-muted/30">-</span>}
                          </td>,
                          <td key={`f${f}-p3`} className={`text-center px-1 py-2.5 ${FECHA_COLORS[f % FECHA_COLORS.length]}`}>
                            {d.p3 || <span className="text-text-muted/30">-</span>}
                          </td>,
                        ];
                      })}
                      <td className="text-center px-1 py-2.5 border-l border-border-light font-semibold text-positive">
                        {j.totalP1 || <span className="text-text-muted/30">-</span>}
                      </td>
                      <td className="text-center px-1 py-2.5 font-semibold text-positive">
                        {j.totalP2 || <span className="text-text-muted/30">-</span>}
                      </td>
                      <td className="text-center px-1 py-2.5 font-semibold text-positive">
                        {j.totalP3 || <span className="text-text-muted/30">-</span>}
                      </td>
                      <td className="text-center px-2 py-2.5 border-l border-border-light font-bold text-gold text-sm">
                        {j.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-bg-header">
                    <td className="px-3 py-3 font-bold text-gold text-[13px] sticky left-0 bg-bg-header z-10">
                      TOTAL
                    </td>
                    {activeFechas.map(f => {
                      const sumP1 = eq.jugadores.reduce((s, j) => s + (j.fechas[f]?.p1 || 0), 0);
                      const sumP2 = eq.jugadores.reduce((s, j) => s + (j.fechas[f]?.p2 || 0), 0);
                      const sumP3 = eq.jugadores.reduce((s, j) => s + (j.fechas[f]?.p3 || 0), 0);
                      return [
                        <td key={`t-f${f}-p1`} className="text-center px-1 py-3 font-bold text-gold border-l border-white/10">{sumP1 || '-'}</td>,
                        <td key={`t-f${f}-p2`} className="text-center px-1 py-3 font-bold text-gold">{sumP2 || '-'}</td>,
                        <td key={`t-f${f}-p3`} className="text-center px-1 py-3 font-bold text-gold">{sumP3 || '-'}</td>,
                      ];
                    })}
                    <td className="text-center px-1 py-3 font-bold text-gold border-l border-white/20">
                      {eq.jugadores.reduce((s, j) => s + j.totalP1, 0)}
                    </td>
                    <td className="text-center px-1 py-3 font-bold text-gold">
                      {eq.jugadores.reduce((s, j) => s + j.totalP2, 0)}
                    </td>
                    <td className="text-center px-1 py-3 font-bold text-gold">
                      {eq.jugadores.reduce((s, j) => s + j.totalP3, 0)}
                    </td>
                    <td className="text-center px-2 py-3 font-bold text-gold text-sm border-l border-white/20">
                      {eq.jugadores.reduce((s, j) => s + j.total, 0)}
                    </td>
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

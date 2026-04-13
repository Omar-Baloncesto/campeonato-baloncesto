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
  const [fechas, setFechas] = useState<string[]>(Array(10).fill(''));
  const [jugadas, setJugadas] = useState<boolean[]>(Array(10).fill(false));
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/sheets?sheet=AsistenciasJugadores').then(r => r.json()),
      fetch('/api/sheets?sheet=FIXTURE').then(r => r.json()),
    ])
      .then(([data, fixtureData]) => {
        // Extract dates from FIXTURE (col 1=jornada, col 5=fecha)
        if (fixtureData.success && fixtureData.data.length > 1) {
          const jornadaDates = new Map<string, string>();
          const jornadaPlayed = new Set<string>();
          fixtureData.data.slice(1).forEach((r: string[]) => {
            const jornada = (r[1] || '').trim();
            const fecha = (r[5] || '').trim();
            const mLocal = parseInt(r[7]) || 0;
            const mVisit = parseInt(r[8]) || 0;
            if (jornada && /^\d+$/.test(jornada)) {
              if (fecha && !jornadaDates.has(jornada)) {
                const parts = fecha.split('/');
                jornadaDates.set(jornada, parts.length >= 2 ? `${parts[0]}/${parts[1]}` : fecha);
              }
              if (mLocal > 0 || mVisit > 0) jornadaPlayed.add(jornada);
            }
          });
          setFechas(Array.from({ length: 10 }, (_, i) => jornadaDates.get(String(i + 1)) || ''));
          setJugadas(Array.from({ length: 10 }, (_, i) => jornadaPlayed.has(String(i + 1))));
        }

        if (data.success && data.data.length > 1) {
          const rows: string[][] = data.data;
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

  // High-contrast colors for both themes
  const checkColor = isLight ? '#0a7a2a' : '#5eff80';
  const crossColor = isLight ? '#c41818' : '#ff6b6b';
  const pctColor = (pct: string) => {
    const n = parseFloat(pct);
    if (n >= 80) return { color: checkColor };
    if (n >= 50) return { color: isLight ? '#8a6400' : '#ffc850' };
    return { color: crossColor };
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
                    <span className="text-sm font-bold" style={pctColor(j.porcentaje)}>
                      {j.porcentaje}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>Asistencia: {j.fraccion}</span>
                    <span>{j.asistencia} de {j.totalFechas} fechas</span>
                  </div>
                  {/* Mini attendance dots */}
                  <div className="flex gap-1.5 mt-3">
                    {j.fechas.map((f, fi) => {
                      const played = jugadas[fi];
                      return (
                        <div
                          key={fi}
                          className="w-5 h-5 rounded text-[10px] flex items-center justify-center font-bold"
                          style={{
                            background: !played ? 'transparent'
                              : f === '1' ? (isLight ? 'rgba(10,122,42,0.15)' : 'rgba(94,255,128,0.15)')
                              : (isLight ? 'rgba(196,24,24,0.15)' : 'rgba(255,107,107,0.15)'),
                            color: !played ? 'transparent' : f === '1' ? checkColor : crossColor,
                          }}
                        >
                          {played ? (f === '1' ? '✓' : '✗') : ''}
                        </div>
                      );
                    })}
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
                    <tr className="bg-bg-header text-[10px] uppercase tracking-wide" style={{ color: '#ffffff' }}>
                      <th className="text-center align-middle px-4 py-3 font-bold text-[14px] w-[160px]">Jugador</th>
                      {fechas.map((f, i) => (
                        <th key={i} className="text-center px-1 py-2.5 font-bold w-[50px]">{f || `F${i + 1}`}</th>
                      ))}
                      <th className="text-center px-1 py-2.5 font-bold w-[55px]">Asist.</th>
                      <th className="text-center px-1 py-2.5 font-bold w-[55px]">Fechas</th>
                      <th className="text-center px-1 py-2.5 font-bold w-[65px]">Fracc.</th>
                      <th className="text-center px-1 py-2.5 font-bold w-[55px]">%</th>
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
                        {j.fechas.map((f, fi) => {
                          const played = jugadas[fi];
                          return (
                            <td key={fi} className="text-center py-2.5">
                              {played ? (
                                <span className="text-sm font-bold" style={{
                                  color: f === '1' ? checkColor : crossColor,
                                }}>
                                  {f === '1' ? '✓' : '✗'}
                                </span>
                              ) : null}
                            </td>
                          );
                        })}
                        <td className="text-center py-2.5 text-xs font-semibold">{j.asistencia}</td>
                        <td className="text-center py-2.5 text-xs">{j.totalFechas}</td>
                        <td className="text-center py-2.5 text-xs font-semibold">{j.fraccion}</td>
                        <td className="text-center py-2.5 text-xs font-bold" style={pctColor(j.porcentaje)}>
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

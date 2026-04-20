'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getTeamColor, isWhiteTeam } from '../lib/constants';
import LoadingState, { EmptyState } from '../components/LoadingState';
import FilterPills from '../components/FilterPills';
import ExportButton from '../components/ExportButton';
import { buildFilename } from '../lib/export';
import { exportAsistenciasPdf } from '../lib/export-pdf';
import { exportTableXlsx } from '../lib/export-excel';
import { parseFixtureRows, isJugado } from '../lib/fixture';

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
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains('light'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const fetchData = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    setLoading(true);
    Promise.all([
      fetch('/api/sheets?sheet=AsistenciasJugadores', { signal }).then(r => r.json()),
      fetch('/api/sheets?sheet=FIXTURE', { signal }).then(r => r.json()),
    ])
      .then(([data, fixtureData]) => {
        if (signal.aborted) return;
        // Extract dates and played status from FIXTURE via the shared parser
        if (fixtureData.success && Array.isArray(fixtureData.data)) {
          const partidos = parseFixtureRows(fixtureData.data);
          const jornadaDates = new Map<string, string>();
          const jornadaPlayed = new Set<string>();
          partidos.forEach((p) => {
            const jornada = (p.jornada || '').trim();
            if (!jornada || !/^\d+$/.test(jornada)) return;
            if (p.fecha && !jornadaDates.has(jornada)) {
              const parts = p.fecha.split('/');
              jornadaDates.set(jornada, parts.length >= 2 ? `${parts[0]}/${parts[1]}` : p.fecha);
            }
            if (isJugado(p)) jornadaPlayed.add(jornada);
          });
          setFechas(Array.from({ length: 10 }, (_, i) => jornadaDates.get(String(i + 1)) || ''));
          setJugadas(Array.from({ length: 10 }, (_, i) => jornadaPlayed.has(String(i + 1))));
        }

        if (data.success && Array.isArray(data.data) && data.data.length > 1) {
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
      })
      .catch((err) => {
        if (err?.name === 'AbortError' || signal.aborted) return;
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchData();
    return () => { abortRef.current?.abort(); };
  }, [fetchData]);

  const eq = equipos[equipoActivo];
  const color = eq ? getTeamColor(eq.nombre) : '#888';

  // Convert the attendance "0/1" strings into the same ✓/✗ glyphs the table
  // shows on-screen. Empty cells (fechas that weren't played yet) render as "-".
  const cellFor = (f: string, i: number) => {
    if (jugadas[i]) return f === '1' ? '✓' : '✗';
    return '-';
  };

  const exportColumns = eq
    ? [
        { header: 'Jugador', cell: (j: Jugador) => j.nombre, align: 'left' as const, width: 28 },
        ...fechas.map((f, i) => ({
          header: f ? `F${i + 1} (${f})` : `F${i + 1}`,
          cell: (j: Jugador) => cellFor(j.fechas[i] ?? '', i),
          align: 'center' as const,
          width: 12,
        })),
        { header: 'Asist.',  cell: (j: Jugador) => j.asistencia,  align: 'center' as const, width: 12 },
        { header: 'Fechas',  cell: (j: Jugador) => j.totalFechas, align: 'center' as const, width: 12 },
        { header: 'Fracción',cell: (j: Jugador) => j.fraccion,    align: 'center' as const, width: 14 },
        { header: '%',       cell: (j: Jugador) => j.porcentaje,  align: 'center' as const, width: 10 },
      ]
    : [];

  const equipoNombre = eq?.nombre ?? '';

  const handleExportPdf = async (destination: "download" | "whatsapp" | "share") => {
    if (!eq) return;
    await exportAsistenciasPdf({
      subtitle: 'Asistencias',
      filename: buildFilename(`asistencias-${equipoNombre}`),
      equipo: equipoNombre,
      equipoColor: getTeamColor(equipoNombre),
      fechas,
      jugadas,
      jugadores: eq.jugadores.map((j) => ({
        nombre: j.nombre,
        fechas: j.fechas,
        asistencia: j.asistencia,
        totalFechas: j.totalFechas,
        fraccion: j.fraccion,
        porcentaje: j.porcentaje,
      })),
      destination,
    });
  };

  const handleExportExcel = async (destination: "download" | "whatsapp" | "share") => {
    if (!eq) return;
    await exportTableXlsx({
      filename: buildFilename(`asistencias-${equipoNombre}`),
      sheetName: (equipoNombre || 'Asistencias').substring(0, 31),
      titleRows: ['Campeonato Baloncesto · Cúcuta 2026', `Asistencias · ${equipoNombre}`],
      columns: exportColumns,
      rows: eq.jugadores,
    });
  };

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
      <div className="px-4 md:px-6 pt-4 flex items-center justify-between">
        <h2 className="text-sm text-text-muted uppercase tracking-widest flex items-center gap-2">
          <span className="w-1 h-4 bg-gold rounded-full" />
          Asistencias
        </h2>
        <ExportButton
          onExportPdf={handleExportPdf}
          onExportExcel={handleExportExcel}
          disabled={loading || !eq || eq.jugadores.length === 0}
        />
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
        ) : !eq || eq.jugadores.length === 0 ? (
          <EmptyState message="No hay datos de asistencia para este equipo todavía." />
        ) : (
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
        )}
      </div>
    </div>
  );
}

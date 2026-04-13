'use client';
import { useEffect, useState } from 'react';
import { getTeamColor, isWhiteTeam } from '../lib/constants';
import LoadingState, { ErrorState } from '../components/LoadingState';
import FilterPills from '../components/FilterPills';
import DataFreshness from '../components/DataFreshness';

// Sheet: PuntosJugadores
// Column layout (0-indexed):
//  0     = Jugador
//  1     = Σ P1 (total 1-point shots)
//  2     = Σ P2 (total 2-point shots)
//  3     = Σ P3 (total 3-point shots)
//  4     = Total
//  5+f*3 = P1 for fecha f  (f = 0..9)
//  6+f*3 = P2 for fecha f
//  7+f*3 = P3 for fecha f

const SPREADSHEET_ID = '1JF2vVbrnMYTMC3WrOVVv-vkTICBxh06S0t-40cyPIo0';

// Fetch directly from the browser using Google's gviz/tq endpoint.
// No API key needed — works for any publicly-shared spreadsheet.
// headers=0 forces all rows (including row 1) into the data array so that
// rows[i] === sheet row (i+1), matching the 1-based filaInicio/filaFin config.
async function fetchSheetRows(sheet: string, range: string): Promise<string[][]> {
  const url =
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq` +
    `?sheet=${encodeURIComponent(sheet)}&range=${encodeURIComponent(range)}&tqx=out:json&headers=0`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();

  const match = text.match(/google\.visualization\.Query\.setResponse\((\{[\s\S]*\})\)/);
  if (!match) throw new Error('Formato de respuesta inesperado');

  const payload = JSON.parse(match[1]) as {
    status: string;
    table: {
      cols: unknown[];
      rows: Array<{ c: Array<{ v: unknown } | null> | null } | null>;
    };
  };
  if (payload.status !== 'ok') throw new Error(`Estado: ${payload.status}`);

  const { cols, rows } = payload.table;
  const numCols = cols.length;

  return rows.map(row => {
    const cells: string[] = new Array(numCols).fill('');
    if (row?.c) {
      row.c.forEach((cell, i) => {
        if (cell?.v != null) cells[i] = String(cell.v);
      });
    }
    return cells;
  });
}

const FECHAS_LABELS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10'];
const FECHAS_FULL   = ['21/02', '28/02', '7/03', '14/03', '26/03', '11/04', '18/04', '25/04', '2/05', '9/05'];

const EQUIPOS_CONFIG = [
  { nombre: 'Miami Heat',            filaInicio: 2,  filaFin: 12 },
  { nombre: 'Brooklyn Nets',         filaInicio: 16, filaFin: 25 },
  { nombre: 'Boston Celtics',        filaInicio: 30, filaFin: 40 },
  { nombre: 'Oklahoma City Thunder', filaInicio: 44, filaFin: 53 },
  { nombre: 'Los Angeles Lakers',    filaInicio: 58, filaFin: 68 },
  { nombre: 'Toronto Raptors',       filaInicio: 72, filaFin: 81 },
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

// Section color styles
const SECTION = {
  p1: {
    cell:   'rgba(234, 179, 8, 0.10)',
    header: 'rgba(234, 179, 8, 0.30)',
    border: 'rgba(234, 179, 8, 0.40)',
    text:   '#f5d45a',
    label:  'Puntos de 1',
  },
  p2: {
    cell:   'rgba(59, 130, 246, 0.12)',
    header: 'rgba(59, 130, 246, 0.32)',
    border: 'rgba(59, 130, 246, 0.40)',
    text:   '#7eb8fa',
    label:  'Puntos de 2',
  },
  p3: {
    cell:   'rgba(236, 72, 153, 0.12)',
    header: 'rgba(236, 72, 153, 0.32)',
    border: 'rgba(236, 72, 153, 0.40)',
    text:   '#f578c4',
    label:  'Puntos de 3',
  },
  sub: {
    cell:   'rgba(34, 197, 94, 0.12)',
    header: 'rgba(34, 197, 94, 0.32)',
    border: 'rgba(34, 197, 94, 0.40)',
    text:   '#5ee897',
    label:  'Subtotales',
  },
  total: {
    cell:   'rgba(180, 80, 20, 0.25)',
    header: 'rgba(180, 80, 20, 0.55)',
    border: 'rgba(200, 100, 40, 0.50)',
    text:   '#f5b870',
    label:  'Total',
  },
};

export default function EstadisticaJugadores() {
  const [equipos, setEquipos]         = useState<EquipoData[]>([]);
  const [equipoActivo, setEquipoActivo] = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = () => {
    setLoading(true);
    setError(false);
    fetchSheetRows('PuntosJugadores', 'A1:AI200')
      .then(rows => {
        if (rows.length < 2) { setError(true); setLoading(false); return; }

        // Detect which fechas have data
        const sampleTeam = EQUIPOS_CONFIG[0];
        const sampleRows = rows
          .slice(sampleTeam.filaInicio - 1, sampleTeam.filaFin)
          .filter(r => r[0] && !r[0].toLowerCase().startsWith('equipo') && r[0] !== sampleTeam.nombre);

        let detectedFechas = 0;
        if (sampleRows.length > 0) {
          for (let f = 0; f < 10; f++) {
            const colBase = 5 + f * 3;
            const hasData = sampleRows.some(r =>
              (r[colBase]   && r[colBase]   !== '0' && r[colBase]   !== '') ||
              (r[colBase+1] && r[colBase+1] !== '0' && r[colBase+1] !== '') ||
              (r[colBase+2] && r[colBase+2] !== '0' && r[colBase+2] !== '')
            );
            if (hasData) detectedFechas = f + 1;
          }
          if (detectedFechas === 0) {
            const maxCols = Math.max(...rows.slice(0, 85).map(r => r.length));
            if (maxCols > 5) detectedFechas = Math.min(10, Math.floor((maxCols - 5) / 3));
          }
        }

        const result: EquipoData[] = EQUIPOS_CONFIG.map(eq => {
          const teamRows = rows
            .slice(eq.filaInicio - 1, eq.filaFin)
            .filter(r => r[0] && r[0] !== eq.nombre && !r[0].toLowerCase().startsWith('equipo'));

          const jugadores: JugadorDetalle[] = teamRows.map(r => {
            const fechas: { p1: number; p2: number; p3: number }[] = [];
            for (let f = 0; f < Math.max(detectedFechas, 10); f++) {
              const colBase = 5 + f * 3;
              fechas.push({
                p1: parseInt(r[colBase])   || 0,
                p2: parseInt(r[colBase+1]) || 0,
                p3: parseInt(r[colBase+2]) || 0,
              });
            }
            return {
              nombre:   r[0],
              totalP1:  parseInt(r[1]) || 0,
              totalP2:  parseInt(r[2]) || 0,
              totalP3:  parseInt(r[3]) || 0,
              total:    parseInt(r[4]) || 0,
              fechas,
            };
          });

          return { nombre: eq.nombre, jugadores };
        });

        setEquipos(result);
        setLastUpdated(new Date());
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, []);

  const eq = equipos[equipoActivo];

  // Always show all 10 fechas; dim those with no data yet
  const ALL_FECHAS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const fechasConDatos = new Set<number>();
  if (equipos.length > 0) {
    for (let f = 0; f < 10; f++) {
      const hasData = equipos.some(team =>
        team.jugadores.some(j => j.fechas[f] && (j.fechas[f].p1 > 0 || j.fechas[f].p2 > 0 || j.fechas[f].p3 > 0))
      );
      if (hasData) fechasConDatos.add(f);
    }
  }

  const nF = 10;
  const tableMinWidth = 160 + nF * 3 * 30 + 3 * 48 + 52;

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
              <span className="text-xs text-text-muted ml-2">{eq.jugadores.length} jugadores</span>
            </div>

            {/* ── Table ── */}
            <div className="overflow-x-auto">
              <table
                className="w-full text-[11px] border-collapse"
                style={{ minWidth: `${tableMinWidth}px` }}
              >
                <thead>
                  {/* ── Row 1: section labels ── */}
                  <tr style={{ color: '#ffffff' }}>
                    <th
                      rowSpan={2}
                      className="text-left px-3 py-2 font-medium sticky left-0 z-20 text-[12px]"
                      style={{ background: 'var(--color-bg-header)', minWidth: '160px' }}
                    >
                      Jugador
                    </th>

                    {/* P1 section */}
                    <th
                      colSpan={nF}
                      className="text-center py-1.5 font-bold tracking-wide text-[11px] uppercase"
                      style={{ background: SECTION.p1.header, borderLeft: `2px solid ${SECTION.p1.border}`, color: SECTION.p1.text }}
                    >
                      {SECTION.p1.label}
                    </th>

                    {/* P2 section */}
                    <th
                      colSpan={nF}
                      className="text-center py-1.5 font-bold tracking-wide text-[11px] uppercase"
                      style={{ background: SECTION.p2.header, borderLeft: `2px solid ${SECTION.p2.border}`, color: SECTION.p2.text }}
                    >
                      {SECTION.p2.label}
                    </th>

                    {/* P3 section */}
                    <th
                      colSpan={nF}
                      className="text-center py-1.5 font-bold tracking-wide text-[11px] uppercase"
                      style={{ background: SECTION.p3.header, borderLeft: `2px solid ${SECTION.p3.border}`, color: SECTION.p3.text }}
                    >
                      {SECTION.p3.label}
                    </th>

                    {/* Subtotales section */}
                    <th
                      colSpan={3}
                      className="text-center py-1.5 font-bold tracking-wide text-[11px] uppercase"
                      style={{ background: SECTION.sub.header, borderLeft: `2px solid ${SECTION.sub.border}`, color: SECTION.sub.text }}
                    >
                      {SECTION.sub.label}
                    </th>

                    {/* Total */}
                    <th
                      rowSpan={2}
                      className="text-center px-2 py-1.5 font-bold tracking-wide text-[11px] uppercase"
                      style={{ background: SECTION.total.header, borderLeft: `2px solid ${SECTION.total.border}`, color: SECTION.total.text, minWidth: '52px' }}
                    >
                      {SECTION.total.label}
                    </th>
                  </tr>

                  {/* ── Row 2: date labels per section ── */}
                  <tr style={{ color: '#ffffffcc' }}>
                    {/* P1 date labels */}
                    {ALL_FECHAS.map((f, i) => {
                      const hasData = fechasConDatos.has(f);
                      return (
                        <th
                          key={`h-p1-${f}`}
                          className="text-center px-1 py-1 font-medium"
                          title={FECHAS_FULL[f]}
                          style={{
                            background: hasData ? SECTION.p1.header : 'rgba(234,179,8,0.08)',
                            borderLeft: i === 0 ? `2px solid ${SECTION.p1.border}` : `1px solid rgba(234,179,8,0.15)`,
                            color: hasData ? '#ffffffcc' : '#ffffff44',
                            minWidth: '30px',
                          }}
                        >
                          {FECHAS_LABELS[f]}
                          <div style={{ fontSize: '8px', opacity: 0.6 }}>{FECHAS_FULL[f]}</div>
                        </th>
                      );
                    })}

                    {/* P2 date labels */}
                    {ALL_FECHAS.map((f, i) => {
                      const hasData = fechasConDatos.has(f);
                      return (
                        <th
                          key={`h-p2-${f}`}
                          className="text-center px-1 py-1 font-medium"
                          title={FECHAS_FULL[f]}
                          style={{
                            background: hasData ? SECTION.p2.header : 'rgba(59,130,246,0.08)',
                            borderLeft: i === 0 ? `2px solid ${SECTION.p2.border}` : `1px solid rgba(59,130,246,0.15)`,
                            color: hasData ? '#ffffffcc' : '#ffffff44',
                            minWidth: '30px',
                          }}
                        >
                          {FECHAS_LABELS[f]}
                          <div style={{ fontSize: '8px', opacity: 0.6 }}>{FECHAS_FULL[f]}</div>
                        </th>
                      );
                    })}

                    {/* P3 date labels */}
                    {ALL_FECHAS.map((f, i) => {
                      const hasData = fechasConDatos.has(f);
                      return (
                        <th
                          key={`h-p3-${f}`}
                          className="text-center px-1 py-1 font-medium"
                          title={FECHAS_FULL[f]}
                          style={{
                            background: hasData ? SECTION.p3.header : 'rgba(236,72,153,0.08)',
                            borderLeft: i === 0 ? `2px solid ${SECTION.p3.border}` : `1px solid rgba(236,72,153,0.15)`,
                            color: hasData ? '#ffffffcc' : '#ffffff44',
                            minWidth: '30px',
                          }}
                        >
                          {FECHAS_LABELS[f]}
                          <div style={{ fontSize: '8px', opacity: 0.6 }}>{FECHAS_FULL[f]}</div>
                        </th>
                      );
                    })}

                    {/* Subtotals column labels */}
                    {(['ΣP1', 'ΣP2', 'ΣP3'] as const).map((lbl, i) => (
                      <th
                        key={`h-sub-${i}`}
                        className="text-center px-1 py-1 font-bold"
                        style={{
                          background: SECTION.sub.header,
                          borderLeft: i === 0 ? `2px solid ${SECTION.sub.border}` : `1px solid rgba(34,197,94,0.15)`,
                          color: SECTION.sub.text,
                          minWidth: '48px',
                        }}
                      >
                        {lbl}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {eq.jugadores.map((j, rowIdx) => {
                    const rowBg = rowIdx % 2 === 0 ? 'var(--color-bg-secondary)' : 'var(--color-bg-card)';
                    return (
                      <tr key={rowIdx} className="border-b border-border-subtle table-row-hover">
                        {/* Player name */}
                        <td
                          className="px-3 py-2 font-medium text-[12px] sticky left-0 z-10"
                          style={{ background: rowBg }}
                        >
                          {j.nombre}
                        </td>

                        {/* P1 per fecha */}
                        {ALL_FECHAS.map((f, i) => {
                          const val = j.fechas[f]?.p1 || 0;
                          const hasFechaData = fechasConDatos.has(f);
                          return (
                            <td
                              key={`p1-${f}`}
                              className="text-center px-1 py-2"
                              style={{
                                background: hasFechaData ? SECTION.p1.cell : 'rgba(234,179,8,0.03)',
                                borderLeft: i === 0 ? `2px solid ${SECTION.p1.border}` : `1px solid rgba(234,179,8,0.08)`,
                              }}
                            >
                              {val > 0
                                ? <span style={{ color: SECTION.p1.text, fontWeight: 600 }}>{val}</span>
                                : <span style={{ opacity: 0.15 }}>-</span>}
                            </td>
                          );
                        })}

                        {/* P2 per fecha */}
                        {ALL_FECHAS.map((f, i) => {
                          const val = j.fechas[f]?.p2 || 0;
                          const hasFechaData = fechasConDatos.has(f);
                          return (
                            <td
                              key={`p2-${f}`}
                              className="text-center px-1 py-2"
                              style={{
                                background: hasFechaData ? SECTION.p2.cell : 'rgba(59,130,246,0.03)',
                                borderLeft: i === 0 ? `2px solid ${SECTION.p2.border}` : `1px solid rgba(59,130,246,0.08)`,
                              }}
                            >
                              {val > 0
                                ? <span style={{ color: SECTION.p2.text, fontWeight: 600 }}>{val}</span>
                                : <span style={{ opacity: 0.15 }}>-</span>}
                            </td>
                          );
                        })}

                        {/* P3 per fecha */}
                        {ALL_FECHAS.map((f, i) => {
                          const val = j.fechas[f]?.p3 || 0;
                          const hasFechaData = fechasConDatos.has(f);
                          return (
                            <td
                              key={`p3-${f}`}
                              className="text-center px-1 py-2"
                              style={{
                                background: hasFechaData ? SECTION.p3.cell : 'rgba(236,72,153,0.03)',
                                borderLeft: i === 0 ? `2px solid ${SECTION.p3.border}` : `1px solid rgba(236,72,153,0.08)`,
                              }}
                            >
                              {val > 0
                                ? <span style={{ color: SECTION.p3.text, fontWeight: 600 }}>{val}</span>
                                : <span style={{ opacity: 0.15 }}>-</span>}
                            </td>
                          );
                        })}

                        {/* Subtotals: ΣP1, ΣP2, ΣP3 */}
                        {[j.totalP1, j.totalP2, j.totalP3].map((val, i) => (
                          <td
                            key={`sub-${i}`}
                            className="text-center px-1 py-2 font-semibold"
                            style={{
                              background: SECTION.sub.cell,
                              borderLeft: i === 0 ? `2px solid ${SECTION.sub.border}` : `1px solid rgba(34,197,94,0.08)`,
                              color: SECTION.sub.text,
                            }}
                          >
                            {val > 0 ? val : <span style={{ opacity: 0.2 }}>-</span>}
                          </td>
                        ))}

                        {/* Grand total */}
                        <td
                          className="text-center px-2 py-2 font-bold text-[13px]"
                          style={{
                            background: SECTION.total.cell,
                            borderLeft: `2px solid ${SECTION.total.border}`,
                            color: SECTION.total.text,
                          }}
                        >
                          {j.total}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* ── Totals row ── */}
                <tfoot>
                  <tr style={{ background: 'var(--color-bg-header)' }}>
                    <td
                      className="px-3 py-3 font-bold text-[13px] sticky left-0 z-10"
                      style={{ background: 'var(--color-bg-header)', color: 'var(--color-gold)' }}
                    >
                      TOTAL
                    </td>

                    {/* P1 totals per fecha */}
                    {ALL_FECHAS.map((f, i) => {
                      const sum = eq.jugadores.reduce((s, j) => s + (j.fechas[f]?.p1 || 0), 0);
                      return (
                        <td key={`t-p1-${f}`} className="text-center px-1 py-3 font-bold"
                          style={{ background: SECTION.p1.header, borderLeft: i === 0 ? `2px solid ${SECTION.p1.border}` : `1px solid rgba(234,179,8,0.15)`, color: SECTION.p1.text }}>
                          {sum || '-'}
                        </td>
                      );
                    })}

                    {/* P2 totals per fecha */}
                    {ALL_FECHAS.map((f, i) => {
                      const sum = eq.jugadores.reduce((s, j) => s + (j.fechas[f]?.p2 || 0), 0);
                      return (
                        <td key={`t-p2-${f}`} className="text-center px-1 py-3 font-bold"
                          style={{ background: SECTION.p2.header, borderLeft: i === 0 ? `2px solid ${SECTION.p2.border}` : `1px solid rgba(59,130,246,0.15)`, color: SECTION.p2.text }}>
                          {sum || '-'}
                        </td>
                      );
                    })}

                    {/* P3 totals per fecha */}
                    {ALL_FECHAS.map((f, i) => {
                      const sum = eq.jugadores.reduce((s, j) => s + (j.fechas[f]?.p3 || 0), 0);
                      return (
                        <td key={`t-p3-${f}`} className="text-center px-1 py-3 font-bold"
                          style={{ background: SECTION.p3.header, borderLeft: i === 0 ? `2px solid ${SECTION.p3.border}` : `1px solid rgba(236,72,153,0.15)`, color: SECTION.p3.text }}>
                          {sum || '-'}
                        </td>
                      );
                    })}

                    {/* Subtotal totals */}
                    {[
                      eq.jugadores.reduce((s, j) => s + j.totalP1, 0),
                      eq.jugadores.reduce((s, j) => s + j.totalP2, 0),
                      eq.jugadores.reduce((s, j) => s + j.totalP3, 0),
                    ].map((val, i) => (
                      <td key={`t-sub-${i}`} className="text-center px-1 py-3 font-bold"
                        style={{ background: SECTION.sub.header, borderLeft: i === 0 ? `2px solid ${SECTION.sub.border}` : `1px solid rgba(34,197,94,0.15)`, color: SECTION.sub.text }}>
                        {val}
                      </td>
                    ))}

                    {/* Grand total */}
                    <td className="text-center px-2 py-3 font-bold text-[14px]"
                      style={{ background: SECTION.total.header, borderLeft: `2px solid ${SECTION.total.border}`, color: SECTION.total.text }}>
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

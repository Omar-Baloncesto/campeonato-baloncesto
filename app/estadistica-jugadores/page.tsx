'use client';
import { useEffect, useState } from 'react';
import { getTeamColor, isWhiteTeam } from '../lib/constants';
import LoadingState, { ErrorState } from '../components/LoadingState';
import FilterPills from '../components/FilterPills';
import DataFreshness from '../components/DataFreshness';

// Sheet: EstadisticasJugadores
// Each team block = 1 title row + 1 big-header row + 1 col-header row + 12 player rows = 15 rows
// Then 2 empty rows before next team → 17 rows per team, starting at row 2
//
// Column mapping (0-indexed):
//  0       = Jugador
//  1..10   = P1 F1..F10  (yellow)
//  11      = Suma P1      (green)
//  12..21  = P2 F1..F10  (blue)
//  22      = Suma P2      (green)
//  23..32  = P3 F1..F10  (pink)
//  33      = Suma P3      (green)
//  34      = Subtotal     (brick)

const SPREADSHEET_ID = '1JF2vVbrnMYTMC3WrOVVv-vkTICBxh06S0t-40cyPIo0';

// Fetch directly from the browser using Google's gviz/tq endpoint.
// This requires no API key — it works for any publicly-shared spreadsheet
// and is called client-side so it bypasses the server proxy entirely.
async function fetchSheetRows(sheet: string, range: string): Promise<string[][]> {
  const url =
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq` +
    `?sheet=${encodeURIComponent(sheet)}&range=${encodeURIComponent(range)}&tqx=out:json&headers=0`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();

  // Response is a JSONP wrapper:  /*O_o*/\ngoogle.visualization.Query.setResponse({...});
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

const FECHAS_LABELS = ['F1','F2','F3','F4','F5','F6','F7','F8','F9','F10'];
const FECHAS_FULL   = ['21/02','28/02','7/03','14/03','26/03','11/04','18/04','25/04','2/05','9/05'];

// Player rows per team (1-based sheet rows → subtract 1 for array index)
// Block starts: 2, 19, 36, 53, 70, 87
// Players start 3 rows into block (after title + big header + col header)
// fila starts at 2; each block adds 1+1+1+12 = 15 rows, then +2 blank = 17
const EQUIPOS_CONFIG = [
  { nombre: 'Miami Heat',            playerRowStart: 5,  playerRowEnd: 16  },
  { nombre: 'Brooklyn Nets',         playerRowStart: 22, playerRowEnd: 33  },
  { nombre: 'Boston Celtics',        playerRowStart: 39, playerRowEnd: 50  },
  { nombre: 'Oklahoma City Thunder', playerRowStart: 56, playerRowEnd: 67  },
  { nombre: 'Los Angeles Lakers',    playerRowStart: 73, playerRowEnd: 84  },
  { nombre: 'Toronto Raptors',       playerRowStart: 90, playerRowEnd: 101 },
];

interface JugadorDetalle {
  nombre: string;
  p1: number[];    // 10 values (F1..F10)
  p2: number[];
  p3: number[];
  sumaP1: number;
  sumaP2: number;
  sumaP3: number;
  subtotal: number;
}

interface EquipoData {
  nombre: string;
  jugadores: JugadorDetalle[];
}

// Colors matching the Google Sheets script exactly
const C = {
  p1:    { bg: 'rgba(255,255,80,0.13)',  hdr: 'rgba(255,255,80,0.28)',  bdr: 'rgba(255,255,80,0.45)',  txt: '#e8e855', label: 'PUNTOS DE 1' },
  p2:    { bg: 'rgba(80,160,255,0.13)',  hdr: 'rgba(80,160,255,0.28)',  bdr: 'rgba(80,160,255,0.45)',  txt: '#7ec8ff', label: 'PUNTOS DE 2' },
  p3:    { bg: 'rgba(255,80,160,0.13)',  hdr: 'rgba(255,80,160,0.28)',  bdr: 'rgba(255,80,160,0.45)',  txt: '#ff80c8', label: 'PUNTOS DE 3' },
  suma:  { bg: 'rgba(80,255,120,0.15)',  hdr: 'rgba(80,255,120,0.30)',  bdr: 'rgba(80,255,120,0.50)',  txt: '#60ee88' },
  sub:   { bg: 'rgba(255,180,80,0.18)',  hdr: 'rgba(255,180,80,0.40)',  bdr: 'rgba(255,180,80,0.55)',  txt: '#ffbe66', label: 'SUBTOTAL'   },
  name:  { bg: 'var(--color-bg-header)',  bdr: 'rgba(255,255,255,0.10)' },
};

function parseNum(v: string | undefined): number {
  return parseInt(String(v ?? '0')) || 0;
}

export default function EstadisticaJugadores() {
  const [equipos, setEquipos]       = useState<EquipoData[]>([]);
  const [equipoActivo, setEquipoActivo] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = () => {
    setLoading(true);
    setError(false);
    fetchSheetRows('EstadisticasJugadores', 'A1:AI200')
      .then(rows => {
        if (rows.length < 2) { setError(true); setLoading(false); return; }

        const result: EquipoData[] = EQUIPOS_CONFIG.map(eq => {
          // rows array is 0-indexed; sheet rows are 1-indexed
          const playerRows = rows.slice(eq.playerRowStart - 1, eq.playerRowEnd);

          const jugadores: JugadorDetalle[] = playerRows
            .filter(r => r[0] && r[0].trim() !== '')  // skip empty rows
            .map(r => ({
              nombre:   r[0],
              p1:       [1,2,3,4,5,6,7,8,9,10].map(i => parseNum(r[i])),
              sumaP1:   parseNum(r[11]),
              p2:       [12,13,14,15,16,17,18,19,20,21].map(i => parseNum(r[i])),
              sumaP2:   parseNum(r[22]),
              p3:       [23,24,25,26,27,28,29,30,31,32].map(i => parseNum(r[i])),
              sumaP3:   parseNum(r[33]),
              subtotal: parseNum(r[34]),
            }));

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
                style={{ minWidth: '1100px' }}
              >
                <thead>
                  {/* ── Row 1: section labels ── */}
                  <tr>
                    <th
                      rowSpan={2}
                      className="text-left px-3 py-2 font-semibold sticky left-0 z-20 text-[12px]"
                      style={{ background: C.name.bg, minWidth: '160px', borderRight: `1px solid ${C.name.bdr}` }}
                    >
                      Jugador
                    </th>

                    {/* PUNTOS DE 1 (10 fecha cols + 1 suma = 11) */}
                    <th
                      colSpan={11}
                      className="text-center py-1.5 font-bold tracking-widest text-[11px] uppercase"
                      style={{ background: C.p1.hdr, borderLeft: `2px solid ${C.p1.bdr}`, color: C.p1.txt }}
                    >
                      {C.p1.label}
                    </th>

                    {/* PUNTOS DE 2 */}
                    <th
                      colSpan={11}
                      className="text-center py-1.5 font-bold tracking-widest text-[11px] uppercase"
                      style={{ background: C.p2.hdr, borderLeft: `2px solid ${C.p2.bdr}`, color: C.p2.txt }}
                    >
                      {C.p2.label}
                    </th>

                    {/* PUNTOS DE 3 */}
                    <th
                      colSpan={11}
                      className="text-center py-1.5 font-bold tracking-widest text-[11px] uppercase"
                      style={{ background: C.p3.hdr, borderLeft: `2px solid ${C.p3.bdr}`, color: C.p3.txt }}
                    >
                      {C.p3.label}
                    </th>

                    {/* SUBTOTAL */}
                    <th
                      rowSpan={2}
                      className="text-center px-2 py-1.5 font-bold tracking-widest text-[11px] uppercase"
                      style={{ background: C.sub.hdr, borderLeft: `2px solid ${C.sub.bdr}`, color: C.sub.txt, minWidth: '60px' }}
                    >
                      {C.sub.label}
                    </th>
                  </tr>

                  {/* ── Row 2: per-section column headers ── */}
                  <tr>
                    {/* P1: F1-F10 + Suma */}
                    {FECHAS_LABELS.map((lbl, i) => (
                      <th
                        key={`hP1-${i}`}
                        className="text-center px-0 py-1 font-medium"
                        title={FECHAS_FULL[i]}
                        style={{
                          background: C.p1.hdr,
                          borderLeft: i === 0 ? `2px solid ${C.p1.bdr}` : `1px solid rgba(255,255,80,0.12)`,
                          color: '#ffffffbb',
                          minWidth: '30px',
                        }}
                      >
                        {lbl}
                        <div style={{ fontSize: '8px', opacity: 0.55 }}>{FECHAS_FULL[i]}</div>
                      </th>
                    ))}
                    <th
                      className="text-center px-1 py-1 font-bold"
                      style={{ background: C.suma.hdr, borderLeft: `1px solid ${C.suma.bdr}`, color: C.suma.txt, minWidth: '44px' }}
                    >
                      Σ P1
                    </th>

                    {/* P2: F1-F10 + Suma */}
                    {FECHAS_LABELS.map((lbl, i) => (
                      <th
                        key={`hP2-${i}`}
                        className="text-center px-0 py-1 font-medium"
                        title={FECHAS_FULL[i]}
                        style={{
                          background: C.p2.hdr,
                          borderLeft: i === 0 ? `2px solid ${C.p2.bdr}` : `1px solid rgba(80,160,255,0.12)`,
                          color: '#ffffffbb',
                          minWidth: '30px',
                        }}
                      >
                        {lbl}
                        <div style={{ fontSize: '8px', opacity: 0.55 }}>{FECHAS_FULL[i]}</div>
                      </th>
                    ))}
                    <th
                      className="text-center px-1 py-1 font-bold"
                      style={{ background: C.suma.hdr, borderLeft: `1px solid ${C.suma.bdr}`, color: C.suma.txt, minWidth: '44px' }}
                    >
                      Σ P2
                    </th>

                    {/* P3: F1-F10 + Suma */}
                    {FECHAS_LABELS.map((lbl, i) => (
                      <th
                        key={`hP3-${i}`}
                        className="text-center px-0 py-1 font-medium"
                        title={FECHAS_FULL[i]}
                        style={{
                          background: C.p3.hdr,
                          borderLeft: i === 0 ? `2px solid ${C.p3.bdr}` : `1px solid rgba(255,80,160,0.12)`,
                          color: '#ffffffbb',
                          minWidth: '30px',
                        }}
                      >
                        {lbl}
                        <div style={{ fontSize: '8px', opacity: 0.55 }}>{FECHAS_FULL[i]}</div>
                      </th>
                    ))}
                    <th
                      className="text-center px-1 py-1 font-bold"
                      style={{ background: C.suma.hdr, borderLeft: `1px solid ${C.suma.bdr}`, color: C.suma.txt, minWidth: '44px' }}
                    >
                      Σ P3
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {eq.jugadores.map((j, rowIdx) => {
                    const rowBg = rowIdx % 2 === 0 ? 'var(--color-bg-secondary)' : 'var(--color-bg-card)';
                    return (
                      <tr key={rowIdx} className="border-b border-border-subtle table-row-hover">
                        {/* Name */}
                        <td
                          className="px-3 py-2 font-medium text-[12px] sticky left-0 z-10"
                          style={{ background: rowBg, borderRight: `1px solid ${C.name.bdr}` }}
                        >
                          {j.nombre}
                        </td>

                        {/* P1 F1-F10 */}
                        {j.p1.map((val, i) => (
                          <td
                            key={`p1-${i}`}
                            className="text-center px-0 py-2"
                            style={{
                              background: C.p1.bg,
                              borderLeft: i === 0 ? `2px solid ${C.p1.bdr}` : `1px solid rgba(255,255,80,0.06)`,
                            }}
                          >
                            {val > 0
                              ? <span style={{ color: C.p1.txt, fontWeight: 600 }}>{val}</span>
                              : <span style={{ opacity: 0.18 }}>-</span>}
                          </td>
                        ))}
                        {/* Suma P1 */}
                        <td
                          className="text-center px-1 py-2 font-bold"
                          style={{ background: C.suma.bg, borderLeft: `1px solid ${C.suma.bdr}`, color: C.suma.txt }}
                        >
                          {j.sumaP1 > 0 ? j.sumaP1 : <span style={{ opacity: 0.25 }}>-</span>}
                        </td>

                        {/* P2 F1-F10 */}
                        {j.p2.map((val, i) => (
                          <td
                            key={`p2-${i}`}
                            className="text-center px-0 py-2"
                            style={{
                              background: C.p2.bg,
                              borderLeft: i === 0 ? `2px solid ${C.p2.bdr}` : `1px solid rgba(80,160,255,0.06)`,
                            }}
                          >
                            {val > 0
                              ? <span style={{ color: C.p2.txt, fontWeight: 600 }}>{val}</span>
                              : <span style={{ opacity: 0.18 }}>-</span>}
                          </td>
                        ))}
                        {/* Suma P2 */}
                        <td
                          className="text-center px-1 py-2 font-bold"
                          style={{ background: C.suma.bg, borderLeft: `1px solid ${C.suma.bdr}`, color: C.suma.txt }}
                        >
                          {j.sumaP2 > 0 ? j.sumaP2 : <span style={{ opacity: 0.25 }}>-</span>}
                        </td>

                        {/* P3 F1-F10 */}
                        {j.p3.map((val, i) => (
                          <td
                            key={`p3-${i}`}
                            className="text-center px-0 py-2"
                            style={{
                              background: C.p3.bg,
                              borderLeft: i === 0 ? `2px solid ${C.p3.bdr}` : `1px solid rgba(255,80,160,0.06)`,
                            }}
                          >
                            {val > 0
                              ? <span style={{ color: C.p3.txt, fontWeight: 600 }}>{val}</span>
                              : <span style={{ opacity: 0.18 }}>-</span>}
                          </td>
                        ))}
                        {/* Suma P3 */}
                        <td
                          className="text-center px-1 py-2 font-bold"
                          style={{ background: C.suma.bg, borderLeft: `1px solid ${C.suma.bdr}`, color: C.suma.txt }}
                        >
                          {j.sumaP3 > 0 ? j.sumaP3 : <span style={{ opacity: 0.25 }}>-</span>}
                        </td>

                        {/* Subtotal */}
                        <td
                          className="text-center px-2 py-2 font-bold text-[13px]"
                          style={{ background: C.sub.bg, borderLeft: `2px solid ${C.sub.bdr}`, color: C.sub.txt }}
                        >
                          {j.subtotal > 0 ? j.subtotal : <span style={{ opacity: 0.25 }}>-</span>}
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
                      style={{ background: 'var(--color-bg-header)', color: 'var(--color-gold)', borderRight: `1px solid ${C.name.bdr}` }}
                    >
                      TOTAL
                    </td>

                    {/* P1 totals */}
                    {[0,1,2,3,4,5,6,7,8,9].map(i => {
                      const sum = eq.jugadores.reduce((s, j) => s + (j.p1[i] || 0), 0);
                      return (
                        <td key={`tP1-${i}`} className="text-center px-0 py-3 font-bold"
                          style={{ background: C.p1.hdr, borderLeft: i === 0 ? `2px solid ${C.p1.bdr}` : `1px solid rgba(255,255,80,0.12)`, color: C.p1.txt }}>
                          {sum || '-'}
                        </td>
                      );
                    })}
                    <td className="text-center px-1 py-3 font-bold"
                      style={{ background: C.suma.hdr, borderLeft: `1px solid ${C.suma.bdr}`, color: C.suma.txt }}>
                      {eq.jugadores.reduce((s, j) => s + j.sumaP1, 0) || '-'}
                    </td>

                    {/* P2 totals */}
                    {[0,1,2,3,4,5,6,7,8,9].map(i => {
                      const sum = eq.jugadores.reduce((s, j) => s + (j.p2[i] || 0), 0);
                      return (
                        <td key={`tP2-${i}`} className="text-center px-0 py-3 font-bold"
                          style={{ background: C.p2.hdr, borderLeft: i === 0 ? `2px solid ${C.p2.bdr}` : `1px solid rgba(80,160,255,0.12)`, color: C.p2.txt }}>
                          {sum || '-'}
                        </td>
                      );
                    })}
                    <td className="text-center px-1 py-3 font-bold"
                      style={{ background: C.suma.hdr, borderLeft: `1px solid ${C.suma.bdr}`, color: C.suma.txt }}>
                      {eq.jugadores.reduce((s, j) => s + j.sumaP2, 0) || '-'}
                    </td>

                    {/* P3 totals */}
                    {[0,1,2,3,4,5,6,7,8,9].map(i => {
                      const sum = eq.jugadores.reduce((s, j) => s + (j.p3[i] || 0), 0);
                      return (
                        <td key={`tP3-${i}`} className="text-center px-0 py-3 font-bold"
                          style={{ background: C.p3.hdr, borderLeft: i === 0 ? `2px solid ${C.p3.bdr}` : `1px solid rgba(255,80,160,0.12)`, color: C.p3.txt }}>
                          {sum || '-'}
                        </td>
                      );
                    })}
                    <td className="text-center px-1 py-3 font-bold"
                      style={{ background: C.suma.hdr, borderLeft: `1px solid ${C.suma.bdr}`, color: C.suma.txt }}>
                      {eq.jugadores.reduce((s, j) => s + j.sumaP3, 0) || '-'}
                    </td>

                    {/* Subtotal total */}
                    <td className="text-center px-2 py-3 font-bold text-[14px]"
                      style={{ background: C.sub.hdr, borderLeft: `2px solid ${C.sub.bdr}`, color: C.sub.txt }}>
                      {eq.jugadores.reduce((s, j) => s + j.subtotal, 0) || '-'}
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

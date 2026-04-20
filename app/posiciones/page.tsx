'use client';
import { useMemo, useState } from 'react';
import { getTeamColor, isWhiteTeam } from '../lib/constants';
import LoadingState, { ErrorState } from '../components/LoadingState';
import DataFreshness from '../components/DataFreshness';
import ExportButton from '../components/ExportButton';
import { buildFilename } from '../lib/export';
import { exportPosicionesPdf } from '../lib/export-pdf';
import { exportTableXlsx } from '../lib/export-excel';
import { useSheetData } from '../lib/useSheetData';

interface Equipo {
  nombre: string;
  pj: string;
  pg: string;
  pp: string;
  puntosAnotados: string;
  puntosRecibidos: string;
  diferencia: string;
  puntos: string;
  puesto: string;
}

function parsePosiciones(rows: string[][]): Equipo[] {
  if (rows.length < 2) return [];
  return rows
    .slice(1)
    .filter((r) => r[0])
    .map((r) => ({
      nombre: r[0], pj: r[1], pg: r[2], pp: r[3],
      puntosAnotados: r[4], puntosRecibidos: r[5],
      diferencia: r[6], puntos: r[7], puesto: r[8],
    }));
}

export default function Posiciones() {
  const { data: equipos, loading, error, lastUpdated, refetch } =
    useSheetData('TablaPosiciones', parsePosiciones);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const lista = equipos ?? [];

  const medallon = (puesto: string, i: number) => {
    const text = ['1°', '2°', '3°', '4°', '5°', '6°'][i] || puesto;
    const cls = i === 0 ? 'medal-gold' : i === 1 ? 'medal-silver' : i === 2 ? 'medal-bronze' : 'text-text-muted';
    return <span className={`text-lg font-bold ${cls}`}>{text}</span>;
  };

  const toggleExpand = (nombre: string) => {
    setExpandedTeam(prev => prev === nombre ? null : nombre);
  };

  // Pre-compute the per-team derived rates so we don't redo the math on
  // every re-render (e.g. opening / closing a row only changes
  // expandedTeam state).
  const equiposConRates = useMemo(() => lista.map((eq) => {
    const pj = Number(eq.pj) || 1;
    const pa = Number(eq.puntosAnotados) || 0;
    const pr = Number(eq.puntosRecibidos) || 0;
    return {
      eq,
      ppgOff: (pa / pj).toFixed(1),
      ppgDef: (pr / pj).toFixed(1),
      ratio: pr > 0 ? (pa / pr).toFixed(2) : '—',
      winPct: ((Number(eq.pg) / pj) * 100).toFixed(0),
    };
  }), [lista]);

  const exportColumns = useMemo(() => ([
    { header: '#',       cell: (e: Equipo) => e.puesto || '',               align: 'center' as const, width: 10 },
    { header: 'Equipo',  cell: (e: Equipo) => e.nombre,                      align: 'left' as const,   width: 60 },
    { header: 'PJ',      cell: (e: Equipo) => Number(e.pj) || 0,              align: 'center' as const, width: 14 },
    { header: 'PG',      cell: (e: Equipo) => Number(e.pg) || 0,              align: 'center' as const, width: 14 },
    { header: 'PP',      cell: (e: Equipo) => Number(e.pp) || 0,              align: 'center' as const, width: 14 },
    { header: 'P. Ano.', cell: (e: Equipo) => Number(e.puntosAnotados) || 0,  align: 'center' as const, width: 20 },
    { header: 'P. Rec.', cell: (e: Equipo) => Number(e.puntosRecibidos) || 0, align: 'center' as const, width: 20 },
    { header: 'Dif.',    cell: (e: Equipo) => Number(e.diferencia) || 0,      align: 'center' as const, width: 16 },
    { header: 'Pts',     cell: (e: Equipo) => Number(e.puntos) || 0,          align: 'center' as const, width: 14 },
  ]), []);

  const handleExportPdf = async (destination: "download" | "whatsapp" | "share") => {
    await exportPosicionesPdf({
      filename: buildFilename('posiciones'),
      rows: lista.map((e, i) => ({
        puesto: ['1°', '2°', '3°', '4°', '5°', '6°'][i] || e.puesto || `${i + 1}°`,
        nombre: e.nombre,
        color: getTeamColor(e.nombre),
        pj: Number(e.pj) || 0,
        pg: Number(e.pg) || 0,
        pp: Number(e.pp) || 0,
        puntosAnotados: Number(e.puntosAnotados) || 0,
        puntosRecibidos: Number(e.puntosRecibidos) || 0,
        diferencia: Number(e.diferencia) || 0,
        puntos: Number(e.puntos) || 0,
      })),
      destination,
    });
  };

  const handleExportExcel = async (destination: "download" | "whatsapp" | "share") => {
    await exportTableXlsx({
      filename: buildFilename('posiciones'),
      sheetName: 'Posiciones',
      titleRows: ['Campeonato Baloncesto · Cúcuta 2026', 'Tabla de posiciones'],
      columns: exportColumns,
      rows: lista,
      destination,
    });
  };

  return (
    <section className="p-4 md:p-6 animate-fade-in" aria-label="Tabla de posiciones">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-1 h-5 bg-gold rounded-full" />
        <h2 className="text-sm text-text-muted uppercase tracking-widest">Tabla de posiciones</h2>
        <div className="ml-auto flex items-center gap-3">
          <ExportButton
            onExportPdf={handleExportPdf}
            onExportExcel={handleExportExcel}
            disabled={loading || error || lista.length === 0}
          />
          <DataFreshness lastUpdated={lastUpdated} onRefresh={refetch} loading={loading} />
        </div>
      </div>

      {loading ? (
        <LoadingState message="Cargando posiciones..." variant="skeleton" rows={6} />
      ) : error ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-bg-header text-[12px] uppercase tracking-wider" style={{ color: '#ffffff' }}>
                  <th className="text-center px-4 md:px-5 py-3.5 font-bold w-12">#</th>
                  <th className="text-center px-4 md:px-5 py-3.5 font-bold">Equipo</th>
                  <th className="text-center px-2 py-3.5 font-bold w-12">PJ</th>
                  <th className="text-center px-2 py-3.5 font-bold w-12">PG</th>
                  <th className="text-center px-2 py-3.5 font-bold w-12">PP</th>
                  <th className="text-center px-2 py-3.5 font-bold">P. Ano.</th>
                  <th className="text-center px-2 py-3.5 font-bold">P. Rec.</th>
                  <th className="text-center px-2 py-3.5 font-bold">Dif.</th>
                  <th className="text-center px-3 py-3.5 font-bold w-14">Pts</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {equiposConRates.map(({ eq, ppgOff, ppgDef, ratio, winPct }, i) => {
                  const color = getTeamColor(eq.nombre);
                  const white = isWhiteTeam(eq.nombre);
                  const isTop3 = i < 3;
                  const isExpanded = expandedTeam === eq.nombre;

                  return [
                    <tr
                      key={`row-${i}`}
                      className={`border-b border-border-subtle table-row-hover cursor-pointer transition-colors ${
                        i % 2 === 0 ? 'bg-bg-secondary/50' : 'bg-bg-card/30'
                      }`}
                      onClick={() => toggleExpand(eq.nombre)}
                      role="button"
                      aria-expanded={isExpanded}
                    >
                      <td className="px-4 md:px-5 py-4 w-12">{medallon(eq.puesto, i)}</td>
                      <td className="px-4 md:px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-1 h-8 rounded-full shrink-0"
                            style={{
                              background: white ? '#FFFFFF' : color,
                              boxShadow: isTop3 ? `0 0 8px ${color}40` : 'none',
                            }}
                          />
                          <span className="text-sm font-medium text-text-primary">
                            {eq.nombre}
                          </span>
                        </div>
                      </td>
                      <td className="text-center text-[13px] py-4 w-12">{eq.pj}</td>
                      <td className="text-center text-[13px] py-4 w-12 text-positive font-medium">{eq.pg}</td>
                      <td className="text-center text-[13px] py-4 w-12 text-negative font-medium">{eq.pp}</td>
                      <td className="text-center text-[13px] py-4">{eq.puntosAnotados}</td>
                      <td className="text-center text-[13px] py-4">{eq.puntosRecibidos}</td>
                      <td className={`text-center text-[13px] py-4 font-medium ${Number(eq.diferencia) >= 0 ? 'text-positive' : 'text-negative'}`}>
                        {Number(eq.diferencia) > 0 ? '+' : ''}{eq.diferencia}
                      </td>
                      <td className="text-center py-4 w-14">
                        <span className={`text-[15px] font-bold ${isTop3 ? 'gradient-text' : 'text-gold'}`}>
                          {eq.puntos}
                        </span>
                      </td>
                      <td className="w-8 text-center">
                        <svg
                          className={`w-4 h-4 text-text-muted transition-transform duration-200 inline-block ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </td>
                    </tr>,
                    isExpanded && (
                      <tr key={`detail-${i}`} className="bg-bg-darkest">
                        <td colSpan={10} className="p-0">
                          <div className="px-6 py-4 border-t border-border-subtle">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                              <StatBox label="Prom. Pts/Part." value={ppgOff} color="text-positive" />
                              <StatBox label="Prom. Pts Rec./Part." value={ppgDef} color="text-negative" />
                              <StatBox label="Ratio PF/PC" value={ratio} color="text-gold" />
                              <StatBox label="% Victorias" value={`${winPct}%`} color="text-text-primary" />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ),
                  ];
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center p-3 rounded-lg bg-bg-secondary border border-border-light">
      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

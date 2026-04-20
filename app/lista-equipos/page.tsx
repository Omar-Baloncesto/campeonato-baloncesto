'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getTeamColor, isWhiteTeam, TEAM_BY_NAME } from '../lib/constants';
import LoadingState, { EmptyState } from '../components/LoadingState';
import FilterPills from '../components/FilterPills';
import ExportButton from '../components/ExportButton';
import { buildFilename } from '../lib/export';
import { exportMarcadoresPdf } from '../lib/export-pdf';
import { exportTableXlsx } from '../lib/export-excel';

interface Partido {
  equipoA: string; q1A: string; q2A: string; q3A: string; q4A: string; taA: string; totalA: string;
  equipoB: string; q1B: string; q2B: string; q3B: string; q4B: string; taB: string; totalB: string;
}

interface Fecha {
  fecha: string;
  partidos: Partido[];
}

const esEquipo = (nombre: string) => !!TEAM_BY_NAME[nombre?.trim()];

export default function ListaEquipos() {
  const [fechas, setFechas] = useState<Fecha[]>([]);
  const [fechaActiva, setFechaActiva] = useState(0);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    fetch('/api/sheets?sheet=ListaEquipos', { signal })
      .then(r => r.json())
      .then(data => {
        if (signal.aborted) return;
        if (data.success && Array.isArray(data.data)) {
          const rows = data.data;
          const result: Fecha[] = [];
          let fechaActual: Fecha | null = null;
          let equipoA: string[] | null = null;

          for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            const f = (r[5] || '').toString().trim();

            if (f.match(/\d{2}\/\d{2}\/\d{4}/)) {
              if (fechaActual) result.push(fechaActual);
              fechaActual = { fecha: f, partidos: [] };
              equipoA = null;
            } else if (esEquipo(f) && fechaActual) {
              if (!equipoA) {
                equipoA = [f, r[6] || '', r[7] || '', r[8] || '', r[9] || '', r[10] || '', r[11] || ''];
              } else {
                fechaActual.partidos.push({
                  equipoA: equipoA[0], q1A: equipoA[1], q2A: equipoA[2], q3A: equipoA[3], q4A: equipoA[4], taA: equipoA[5], totalA: equipoA[6],
                  equipoB: f, q1B: r[6] || '', q2B: r[7] || '', q3B: r[8] || '', q4B: r[9] || '', taB: r[10] || '', totalB: r[11] || '',
                });
                equipoA = null;
              }
            }
          }
          if (fechaActual) result.push(fechaActual);
          setFechas(result.filter(f => f.partidos.length > 0));
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

  const fecha = fechas[fechaActiva];

  // For the Excel export we still flatten all fechas into one sheet — Excel
  // users typically want the whole tournament. For the PDF we only export
  // the fecha the user is currently viewing (same behaviour as the web).
  type MarcadorRow = {
    fecha: string;
    equipo: string;
    q1: string;
    q2: string;
    q3: string;
    q4: string;
    ta: string;
    total: string;
    resultado: string;
  };
  const flatRows: MarcadorRow[] = [];
  fechas.forEach((f) => {
    f.partidos.forEach((p) => {
      const totA = parseInt(p.totalA, 10) || 0;
      const totB = parseInt(p.totalB, 10) || 0;
      const resA = totA === totB ? 'Empate' : totA > totB ? 'Ganador' : '';
      const resB = totA === totB ? 'Empate' : totB > totA ? 'Ganador' : '';
      flatRows.push({
        fecha: f.fecha, equipo: p.equipoA,
        q1: p.q1A, q2: p.q2A, q3: p.q3A, q4: p.q4A, ta: p.taA,
        total: p.totalA || '0', resultado: resA,
      });
      flatRows.push({
        fecha: f.fecha, equipo: p.equipoB,
        q1: p.q1B, q2: p.q2B, q3: p.q3B, q4: p.q4B, ta: p.taB,
        total: p.totalB || '0', resultado: resB,
      });
    });
  });

  const excelColumns = [
    { header: 'Fecha',     cell: (r: MarcadorRow) => r.fecha,     align: 'center' as const, width: 18 },
    { header: 'Equipo',    cell: (r: MarcadorRow) => r.equipo,    align: 'left'   as const, width: 28 },
    { header: '1°',        cell: (r: MarcadorRow) => r.q1 || '-', align: 'center' as const, width: 10 },
    { header: '2°',        cell: (r: MarcadorRow) => r.q2 || '-', align: 'center' as const, width: 10 },
    { header: '3°',        cell: (r: MarcadorRow) => r.q3 || '-', align: 'center' as const, width: 10 },
    { header: '4°',        cell: (r: MarcadorRow) => r.q4 || '-', align: 'center' as const, width: 10 },
    { header: 'TA',        cell: (r: MarcadorRow) => r.ta || '-', align: 'center' as const, width: 10 },
    { header: 'Total',     cell: (r: MarcadorRow) => r.total,     align: 'center' as const, width: 12 },
    { header: 'Resultado', cell: (r: MarcadorRow) => r.resultado, align: 'center' as const, width: 16 },
  ];

  const handleExportPdf = async (destination: "download" | "whatsapp" | "share") => {
    if (!fecha) return;
    await exportMarcadoresPdf({
      filename: buildFilename(`marcadores-${fecha.fecha.replace(/\//g, '-')}`),
      fecha: fecha.fecha,
      partidos: fecha.partidos.map((p) => ({
        equipoA: p.equipoA,
        q1A: p.q1A, q2A: p.q2A, q3A: p.q3A, q4A: p.q4A, taA: p.taA, totalA: p.totalA,
        equipoB: p.equipoB,
        q1B: p.q1B, q2B: p.q2B, q3B: p.q3B, q4B: p.q4B, taB: p.taB, totalB: p.totalB,
        colorA: getTeamColor(p.equipoA),
        colorB: getTeamColor(p.equipoB),
      })),
      destination,
    });
  };

  const handleExportExcel = async (destination: "download" | "whatsapp" | "share") => {
    await exportTableXlsx({
      filename: buildFilename('marcadores'),
      sheetName: 'Marcadores',
      titleRows: ['Campeonato Baloncesto · Cúcuta 2026', 'Marcadores por cuarto'],
      columns: excelColumns,
      rows: flatRows,
      destination,
    });
  };

  return (
    <div className="animate-fade-in">
      <div className="px-4 md:px-6 pt-4 flex items-center justify-between">
        <h2 className="text-sm text-text-muted uppercase tracking-widest flex items-center gap-2">
          <span className="w-1 h-4 bg-gold rounded-full" />
          Marcadores por cuarto
        </h2>
        <ExportButton
          onExportPdf={handleExportPdf}
          onExportExcel={handleExportExcel}
          disabled={loading || flatRows.length === 0}
        />
      </div>

      <div className="px-4 md:px-6 py-4">
        <FilterPills
          items={fechas.map((f, i) => ({ key: String(i), label: f.fecha }))}
          active={String(fechaActiva)}
          onChange={(key) => setFechaActiva(Number(key))}
        />
      </div>

      <div className="px-4 md:px-6 pb-8">
        {loading ? (
          <LoadingState message="Cargando marcadores..." />
        ) : fechas.length === 0 ? (
          <EmptyState message="Aún no hay marcadores publicados." />
        ) : fecha ? (
          <div className="flex flex-col gap-3">
            {fecha.partidos.map((p, i) => {
              const ganA = parseInt(p.totalA, 10) > parseInt(p.totalB, 10);
              const ganB = parseInt(p.totalB, 10) > parseInt(p.totalA, 10);
              return (
                <div
                  key={`${fecha.fecha}-${p.equipoA}-${p.equipoB}-${i}`}
                  className="bg-bg-secondary rounded-xl overflow-hidden border border-border-light transition-all duration-150 hover:border-gold/15"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px]">
                      <thead>
                        <tr className="bg-bg-header text-[11px] text-text-muted uppercase">
                          <th className="text-left px-4 py-2 font-medium w-[140px] md:w-[180px]">Equipo</th>
                          <th className="text-center px-2 py-2 font-medium">1°</th>
                          <th className="text-center px-2 py-2 font-medium">2°</th>
                          <th className="text-center px-2 py-2 font-medium">3°</th>
                          <th className="text-center px-2 py-2 font-medium">4°</th>
                          <th className="text-center px-2 py-2 font-medium">TA</th>
                          <th className="text-center px-2 py-2 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { name: p.equipoA, quarters: [p.q1A, p.q2A, p.q3A, p.q4A, p.taA], total: p.totalA, won: ganA },
                          { name: p.equipoB, quarters: [p.q1B, p.q2B, p.q3B, p.q4B, p.taB], total: p.totalB, won: ganB },
                        ].map((team, ei) => (
                          <tr
                            key={ei}
                            className={`transition-colors hover:bg-white/[0.03] ${
                              ei === 0 ? '' : 'border-t border-border-subtle'
                            }`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{
                                    background: isWhiteTeam(team.name) ? '#CCCCCC' : getTeamColor(team.name),
                                  }}
                                />
                                <span className="text-xs font-medium truncate">{team.name}</span>
                              </div>
                            </td>
                            {team.quarters.map((q, qi) => (
                              <td key={qi} className="text-center py-3 text-[13px]">{q || '-'}</td>
                            ))}
                            <td className={`text-center py-3 text-[15px] font-bold ${
                              team.won ? 'text-gold' : 'text-text-primary'
                            }`}>
                              {team.total || '0'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

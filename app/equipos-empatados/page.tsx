'use client';
import { getTeamColor, isWhiteTeam, TEAM_BY_NAME } from '../lib/constants';
import LoadingState, { ErrorState, EmptyState } from '../components/LoadingState';
import DataFreshness from '../components/DataFreshness';
import { useSheetData } from '../lib/useSheetData';

interface SheetTable {
  headers: string[];
  rows: string[][];
}

/**
 * The EquiposEmpatados sheet's column layout may change between fechas, so
 * we treat the first non-empty row as headers and dump everything below it.
 * Empty trailing rows are filtered out so the table doesn't grow blank rows.
 */
function parseEquiposEmpatados(rows: string[][]): SheetTable {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { headers: [], rows: [] };
  }
  const [head, ...rest] = rows;
  const headers = (head ?? []).map((c) => (c ?? '').toString().trim());
  const data = rest.filter((r) =>
    r.some((c) => (c ?? '').toString().trim().length > 0),
  );
  return { headers, rows: data };
}

const isTeamName = (value: string): boolean => !!TEAM_BY_NAME[value?.trim()];

export default function EquiposEmpatados() {
  const { data, loading, error, lastUpdated, refetch } = useSheetData(
    'EquiposEmpatados',
    parseEquiposEmpatados,
  );
  const table: SheetTable = data ?? { headers: [], rows: [] };
  const colCount = Math.max(
    table.headers.length,
    ...table.rows.map((r) => r.length),
    0,
  );

  return (
    <div className="animate-fade-in">
      <div className="px-4 md:px-6 pt-4 flex items-center justify-between">
        <h2 className="text-sm text-text-muted uppercase tracking-widest flex items-center gap-2">
          <span className="w-1 h-4 bg-gold rounded-full" />
          Equipos Empatados
        </h2>
        <DataFreshness lastUpdated={lastUpdated} onRefresh={refetch} loading={loading} />
      </div>

      <div className="px-4 md:px-6 py-4 pb-8">
        {loading ? (
          <LoadingState message="Cargando equipos empatados..." />
        ) : error ? (
          <ErrorState onRetry={refetch} />
        ) : table.rows.length === 0 ? (
          <EmptyState message="Aún no hay equipos empatados publicados." />
        ) : (
          <div className="bg-bg-secondary rounded-xl overflow-hidden border border-border-light">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-bg-header text-[11px] text-text-muted uppercase">
                    {Array.from({ length: colCount }).map((_, i) => (
                      <th
                        key={i}
                        className="text-left px-4 py-2.5 font-medium whitespace-nowrap"
                      >
                        {table.headers[i] || ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((r, ri) => (
                    <tr
                      key={ri}
                      className={`transition-colors hover:bg-white/[0.03] ${
                        ri === 0 ? '' : 'border-t border-border-subtle'
                      }`}
                    >
                      {Array.from({ length: colCount }).map((_, ci) => {
                        const raw = (r[ci] ?? '').toString().trim();
                        const team = isTeamName(raw) ? raw : null;
                        return (
                          <td
                            key={ci}
                            className="px-4 py-3 text-[13px] whitespace-nowrap"
                          >
                            {team ? (
                              <span className="inline-flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{
                                    background: isWhiteTeam(team)
                                      ? '#CCCCCC'
                                      : getTeamColor(team),
                                  }}
                                />
                                <span className="font-medium">{team}</span>
                              </span>
                            ) : (
                              raw || <span className="text-text-muted">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

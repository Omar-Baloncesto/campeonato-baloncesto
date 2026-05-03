'use client';
import { getTeamColor, isWhiteTeam, TEAM_BY_NAME } from '../lib/constants';
import LoadingState, { ErrorState, EmptyState } from '../components/LoadingState';
import DataFreshness from '../components/DataFreshness';
import { useSheetData } from '../lib/useSheetData';

interface Grupo {
  /** Team rows: each cell aligns with `headers`. */
  filas: string[][];
  /** Free-text rows that only have content in the first column (e.g. "Criterio FIBA aplicado..."). */
  notas: string[];
}

interface SheetTabla {
  headers: string[];
  grupos: Grupo[];
}

/**
 * The EquiposEmpatados sheet stacks one group of tied teams per block,
 * separated by a repeated header row. Some blocks also include free-text
 * notes (FIBA criterion, "tied at N points", etc.) that only fill the
 * first column. We split the rows into groups and tag those notes so the
 * page can render them as captions instead of dashed-out table rows.
 */
function parseEquiposEmpatados(rows: string[][]): SheetTabla {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { headers: [], grupos: [] };
  }
  const cleaned = rows
    .map((r) => r.map((c) => (c ?? '').toString().trim()))
    .filter((r) => r.some((c) => c.length > 0));
  if (cleaned.length === 0) return { headers: [], grupos: [] };

  const headers = cleaned[0];
  const headerKey = (headers[0] || '').toLowerCase();

  const grupos: Grupo[] = [{ filas: [], notas: [] }];
  for (let i = 1; i < cleaned.length; i++) {
    const row = cleaned[i];
    const first = (row[0] || '').toLowerCase();
    if (first === headerKey) {
      grupos.push({ filas: [], notas: [] });
      continue;
    }
    const otrasConContenido = row.slice(1).some((c) => c.length > 0);
    if (!otrasConContenido) {
      grupos[grupos.length - 1].notas.push(row[0]);
    } else {
      grupos[grupos.length - 1].filas.push(row);
    }
  }

  return {
    headers,
    grupos: grupos.filter((g) => g.filas.length > 0 || g.notas.length > 0),
  };
}

const isTeamName = (value: string): boolean => !!TEAM_BY_NAME[value?.trim()];

export default function EquiposEmpatados() {
  const { data, loading, error, lastUpdated, refetch } = useSheetData(
    'EquiposEmpatados',
    parseEquiposEmpatados,
  );
  const tabla: SheetTabla = data ?? { headers: [], grupos: [] };
  const colCount = Math.max(
    tabla.headers.length,
    ...tabla.grupos.flatMap((g) => g.filas.map((r) => r.length)),
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
        ) : tabla.grupos.length === 0 ? (
          <EmptyState message="Aún no hay equipos empatados publicados." />
        ) : (
          <div className="flex flex-col gap-4">
            {tabla.grupos.map((grupo, gi) => (
              <div
                key={gi}
                className="bg-bg-secondary rounded-xl overflow-hidden border border-border-light"
              >
                {grupo.filas.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-bg-header text-[11px] text-text-muted uppercase">
                          {Array.from({ length: colCount }).map((_, i) => (
                            <th
                              key={i}
                              className="text-left px-4 py-2.5 font-medium whitespace-nowrap"
                            >
                              {tabla.headers[i] || ''}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.filas.map((fila, ri) => (
                          <tr
                            key={ri}
                            className={`transition-colors hover:bg-white/[0.03] ${
                              ri === 0 ? '' : 'border-t border-border-subtle'
                            }`}
                          >
                            {Array.from({ length: colCount }).map((_, ci) => {
                              const raw = (fila[ci] ?? '').toString().trim();
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
                                    <span className={ci === 0 ? '' : 'font-semibold'}>
                                      {raw}
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {grupo.notas.length > 0 && (
                  <div
                    className={`px-4 py-3 flex flex-col gap-1.5 bg-black/[0.02] ${
                      grupo.filas.length > 0 ? 'border-t border-border-subtle' : ''
                    }`}
                  >
                    {grupo.notas.map((nota, ni) => (
                      <div
                        key={ni}
                        className="text-[12px] text-text-muted italic flex items-start gap-2"
                      >
                        <span className="text-gold/70 leading-none mt-[2px]">•</span>
                        <span>{nota}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

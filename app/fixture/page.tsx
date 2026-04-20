'use client';
import { useState } from 'react';
import { getTeamColor, isWhiteTeam } from '../lib/constants';
import LoadingState, { ErrorState } from '../components/LoadingState';
import FilterPills from '../components/FilterPills';
import DataFreshness from '../components/DataFreshness';
import { useSheetData } from '../lib/useSheetData';
import { parseFixtureRows, isJugado, type Partido } from '../lib/fixture';

export default function Fixture() {
  const { data, loading, error, lastUpdated, refetch } =
    useSheetData('FIXTURE', parseFixtureRows);
  const [jornada, setJornada] = useState('Todos');
  const partidos: Partido[] = data ?? [];

  const jornadas = ['Todos', ...Array.from(new Set(partidos.map(p => p.jornada)))];
  const filtrados = jornada === 'Todos' ? partidos : partidos.filter(p => p.jornada === jornada);
  const jugado = isJugado;

  return (
    <div className="animate-fade-in">
      <div className="px-4 md:px-6 pt-4 flex items-center justify-between">
        <h2 className="text-sm text-text-muted uppercase tracking-widest flex items-center gap-2">
          <span className="w-1 h-4 bg-gold rounded-full" />
          Fixture
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted">
            {loading ? '' : `${partidos.filter(jugado).length} jugados · ${partidos.filter(p => !jugado(p)).length} pendientes`}
          </span>
          <DataFreshness lastUpdated={lastUpdated} onRefresh={refetch} loading={loading} />
        </div>
      </div>

      <div className="px-4 md:px-6 py-4">
        <FilterPills
          items={jornadas.map(j => ({
            key: j,
            label: j === 'Todos' ? 'Todos' : `Jornada ${j}`,
          }))}
          active={jornada}
          onChange={setJornada}
        />
      </div>

      <div className="px-4 md:px-6 pb-8">
        {loading ? (
          <LoadingState message="Cargando fixture..." />
        ) : error ? (
          <ErrorState onRetry={refetch} />
        ) : (
          <div className="flex flex-col gap-3 stagger-children">
            {filtrados.map(p => {
              const played = jugado(p);
              const localWin = p.marcadorLocal > p.marcadorVisitante;
              const visitWin = p.marcadorVisitante > p.marcadorLocal;
              return (
                <div
                  key={p.id}
                  className={`glass-card rounded-xl p-4 md:px-5 glow-hover ${
                    played ? 'border-gold-dim' : ''
                  }`}
                >
                  {/* Mobile */}
                  <div className="flex flex-col sm:hidden gap-3">
                    <div className="flex items-center justify-between">
                      <TeamDot name={p.local} bold={played && localWin} />
                      {played && (
                        <span className={`text-xl font-bold ${localWin ? 'gradient-text' : 'text-text-muted'}`}>
                          {p.marcadorLocal}
                        </span>
                      )}
                    </div>
                    <div className="text-center">
                      {!played ? (
                        <div>
                          <div className="text-sm font-semibold text-gold">{p.hora}</div>
                          <div className="text-[11px] text-text-muted">{p.fecha}</div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-text-muted">{p.fecha}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <TeamDot name={p.visitante} bold={played && visitWin} />
                      {played && (
                        <span className={`text-xl font-bold ${visitWin ? 'gradient-text' : 'text-text-muted'}`}>
                          {p.marcadorVisitante}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Desktop */}
                  <div className="hidden sm:grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <TeamDot name={p.local} bold={played && localWin} />
                    <div className="text-center min-w-[110px]">
                      {played ? (
                        <>
                          <div className="flex items-center gap-3 justify-center">
                            <span className={`text-2xl font-bold ${localWin ? 'gradient-text score-glow' : 'text-text-muted'}`}>
                              {p.marcadorLocal}
                            </span>
                            <span className="text-text-muted/40 text-lg font-light">:</span>
                            <span className={`text-2xl font-bold ${visitWin ? 'gradient-text score-glow' : 'text-text-muted'}`}>
                              {p.marcadorVisitante}
                            </span>
                          </div>
                          <div className="text-[10px] text-text-muted mt-1">{p.fecha}</div>
                        </>
                      ) : (
                        <div className="py-1">
                          <div className="text-base font-semibold text-gold">{p.hora}</div>
                          <div className="text-[11px] text-text-muted">{p.fecha}</div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 justify-end">
                      <span className={`text-sm ${played && visitWin ? 'font-bold' : played ? 'text-text-muted' : 'font-medium'}`}>{p.visitante}</span>
                      <TeamColorBar name={p.visitante} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamDot({ name, bold }: { name: string; bold?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <TeamColorBar name={name} />
      <span className={`text-sm ${bold ? 'font-bold text-text-primary' : 'font-medium'}`}>{name}</span>
    </div>
  );
}

function TeamColorBar({ name }: { name: string }) {
  return (
    <div
      className="w-1 h-6 rounded-full shrink-0"
      style={{
        background: isWhiteTeam(name) ? '#FFFFFF' : getTeamColor(name),
        boxShadow: `0 0 6px ${getTeamColor(name)}40`,
      }}
    />
  );
}

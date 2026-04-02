'use client';
import { useEffect, useState } from 'react';
import { getTeamColor, isWhiteTeam } from '../lib/constants';
import LoadingState from '../components/LoadingState';
import FilterPills from '../components/FilterPills';

interface Partido {
  id: string;
  jornada: string;
  local: string;
  visitante: string;
  fecha: string;
  hora: string;
  marcadorLocal: number;
  marcadorVisitante: number;
}

export default function Fixture() {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [jornada, setJornada] = useState('Todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sheets?sheet=FIXTURE')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data.length > 1) {
          const rows = data.data.slice(1).filter((r: string[]) => r[0]);
          setPartidos(rows.map((r: string[]) => ({
            id: r[0], jornada: r[1], local: r[2],
            visitante: r[4], fecha: r[5], hora: r[6],
            marcadorLocal: parseInt(r[7]) || 0,
            marcadorVisitante: parseInt(r[8]) || 0,
          })));
        }
        setLoading(false);
      });
  }, []);

  const jornadas = ['Todos', ...Array.from(new Set(partidos.map(p => p.jornada)))];
  const filtrados = jornada === 'Todos' ? partidos : partidos.filter(p => p.jornada === jornada);
  const jugado = (p: Partido) => p.marcadorLocal > 0 || p.marcadorVisitante > 0;

  const jugados = partidos.filter(jugado).length;
  const pendientes = partidos.filter(p => !jugado(p)).length;

  return (
    <div className="animate-fade-in">
      {/* Info bar */}
      <div className="px-4 md:px-6 pt-4 flex items-center justify-between">
        <h2 className="text-sm text-text-muted uppercase tracking-widest">
          <span role="img" aria-label="calendario">🗓</span> Fixture
        </h2>
        <span className="text-xs text-text-muted">
          {loading ? 'Cargando...' : `${jugados} jugados · ${pendientes} pendientes`}
        </span>
      </div>

      {/* Filters */}
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

      {/* Matches */}
      <div className="px-4 md:px-6 pb-8">
        {loading ? (
          <LoadingState message="Cargando fixture..." />
        ) : (
          <div className="flex flex-col gap-3">
            {filtrados.map(p => {
              const played = jugado(p);
              return (
                <div
                  key={p.id}
                  className={`bg-bg-secondary rounded-xl p-4 md:px-5 border transition-all duration-150 hover:border-gold/20 hover:-translate-y-0.5 ${
                    played ? 'border-gold-dim' : 'border-border-light'
                  }`}
                >
                  {/* Mobile: stack layout */}
                  <div className="flex flex-col sm:hidden gap-3">
                    <div className="flex items-center justify-between">
                      <TeamDot name={p.local} />
                      {played && (
                        <span className={`text-xl font-bold ${p.marcadorLocal > p.marcadorVisitante ? 'text-gold' : 'text-text-primary'}`}>
                          {p.marcadorLocal}
                        </span>
                      )}
                    </div>
                    <div className="text-center">
                      {played ? (
                        <span className="text-[10px] text-text-muted">{p.fecha}</span>
                      ) : (
                        <div>
                          <div className="text-sm font-semibold text-gold">{p.hora}</div>
                          <div className="text-[11px] text-text-muted">{p.fecha}</div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <TeamDot name={p.visitante} />
                      {played && (
                        <span className={`text-xl font-bold ${p.marcadorVisitante > p.marcadorLocal ? 'text-gold' : 'text-text-primary'}`}>
                          {p.marcadorVisitante}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Desktop: grid layout */}
                  <div className="hidden sm:grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <TeamDot name={p.local} />
                    <div className="text-center min-w-[100px]">
                      {played ? (
                        <>
                          <div className="flex items-center gap-2 justify-center">
                            <span className={`text-xl font-bold ${p.marcadorLocal > p.marcadorVisitante ? 'text-gold' : 'text-text-primary'}`}>
                              {p.marcadorLocal}
                            </span>
                            <span className="text-text-muted text-xs">—</span>
                            <span className={`text-xl font-bold ${p.marcadorVisitante > p.marcadorLocal ? 'text-gold' : 'text-text-primary'}`}>
                              {p.marcadorVisitante}
                            </span>
                          </div>
                          <div className="text-[10px] text-text-muted mt-0.5">{p.fecha}</div>
                        </>
                      ) : (
                        <div>
                          <div className="text-[15px] font-semibold text-gold">{p.hora}</div>
                          <div className="text-[11px] text-text-muted">{p.fecha}</div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 justify-end">
                      <span className="text-sm font-medium">{p.visitante}</span>
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{
                          background: isWhiteTeam(p.visitante) ? '#FFFFFF' : getTeamColor(p.visitante),
                          border: isWhiteTeam(p.visitante) ? '1px solid #ccc' : 'none',
                        }}
                      />
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

function TeamDot({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{
          background: isWhiteTeam(name) ? '#FFFFFF' : getTeamColor(name),
          border: isWhiteTeam(name) ? '1px solid #ccc' : 'none',
        }}
      />
      <span className="text-sm font-medium">{name}</span>
    </div>
  );
}

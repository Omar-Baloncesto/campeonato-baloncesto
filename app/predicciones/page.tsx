'use client';
import { useEffect, useState } from 'react';
import { getTeamColor, isWhiteTeam } from '../lib/constants';
import LoadingState, { ErrorState } from '../components/LoadingState';
import FilterPills from '../components/FilterPills';
import DataFreshness from '../components/DataFreshness';
import { useToast } from '../components/ToastProvider';

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

type Predictions = Record<string, string>;

function loadPredictions(): Predictions {
  try {
    return JSON.parse(localStorage.getItem('predicciones') || '{}');
  } catch { return {}; }
}

function savePredictions(p: Predictions) {
  localStorage.setItem('predicciones', JSON.stringify(p));
}

export default function Predicciones() {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [jornada, setJornada] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [predictions, setPredictions] = useState<Predictions>({});
  const { showToast } = useToast();

  const fetchData = () => {
    setLoading(true);
    setError(false);
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
          setLastUpdated(new Date());
        } else if (!data.success) setError(true);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { setPredictions(loadPredictions()); }, []);

  const jugado = (p: Partido) => p.marcadorLocal > 0 || p.marcadorVisitante > 0;
  const ganador = (p: Partido) => p.marcadorLocal > p.marcadorVisitante ? p.local : p.visitante;

  const predict = (matchId: string, team: string) => {
    if (predictions[matchId] === team) {
      // Toggle off
      const updated = { ...predictions };
      delete updated[matchId];
      setPredictions(updated);
      savePredictions(updated);
      showToast('Predicción eliminada', 'info');
    } else {
      const updated = { ...predictions, [matchId]: team };
      setPredictions(updated);
      savePredictions(updated);
      showToast(`Predicción: ${team}`, 'success');
    }
  };

  const jornadas = ['Todos', ...Array.from(new Set(partidos.map(p => p.jornada)))];
  const filtrados = jornada === 'Todos' ? partidos : partidos.filter(p => p.jornada === jornada);

  // Stats
  const totalPredicted = Object.keys(predictions).length;
  const played = partidos.filter(jugado);
  const resolved = played.filter(p => predictions[p.id]);
  const correct = resolved.filter(p => predictions[p.id] === ganador(p));
  const wrong = resolved.filter(p => predictions[p.id] !== ganador(p));
  const pending = partidos.filter(p => !jugado(p) && predictions[p.id]);
  const pct = resolved.length > 0 ? Math.round((correct.length / resolved.length) * 100) : 0;

  return (
    <div className="animate-fade-in">
      <div className="px-4 md:px-6 pt-4 flex items-center justify-between">
        <h2 className="text-sm text-text-muted uppercase tracking-widest flex items-center gap-2">
          <span className="w-1 h-4 bg-gold rounded-full" />
          Predicciones
        </h2>
        <DataFreshness lastUpdated={lastUpdated} onRefresh={fetchData} loading={loading} />
      </div>

      {/* Stats bar - always visible */}
      <div className="px-4 md:px-6 pt-4">
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-text-muted uppercase tracking-widest font-semibold">Tu ranking de aciertos</span>
            <span className="text-2xl font-black gradient-text">{totalPredicted > 0 ? `${pct}%` : '—'}</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-darkest)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: resolved.length > 0 ? `${pct}%` : '0%',
                background: pct >= 70 ? 'var(--color-positive)' : pct >= 40 ? 'var(--color-gold)' : 'var(--color-negative)',
              }}
            />
          </div>
          <div className="grid grid-cols-4 gap-2 mt-3">
            <MiniStat label="Aciertos" value={correct.length} color="var(--color-positive)" />
            <MiniStat label="Fallos" value={wrong.length} color="var(--color-negative)" />
            <MiniStat label="Pendientes" value={pending.length} color="var(--color-gold)" />
            <MiniStat label="Predicciones" value={totalPredicted} color="var(--color-text-primary)" />
          </div>
          {totalPredicted === 0 && (
            <div className="text-center mt-3 text-xs text-text-muted">
              Toca un equipo en cualquier partido para hacer tu predicción
            </div>
          )}
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
          <LoadingState message="Cargando partidos..." />
        ) : error ? (
          <ErrorState onRetry={fetchData} />
        ) : (
          <div className="flex flex-col gap-3 stagger-children">
            {filtrados.map(p => {
              const played = jugado(p);
              const winner = played ? ganador(p) : null;
              const pred = predictions[p.id];
              const isCorrect = played && pred === winner;
              const isWrong = played && !!pred && pred !== winner;

              return (
                <div
                  key={p.id}
                  className={`glass-card rounded-xl overflow-hidden ${
                    isCorrect ? 'ring-2 ring-positive/40' :
                    isWrong ? 'ring-2 ring-negative/40' : ''
                  }`}
                >
                  {/* Result badge */}
                  {played && pred && (
                    <div className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-center ${
                      isCorrect ? 'bg-positive/20 text-positive' : 'bg-negative/20 text-negative'
                    }`}>
                      {isCorrect ? '✓ ACERTASTE' : '✗ FALLASTE'}
                    </div>
                  )}

                  <div className="p-4">
                    {/* Date */}
                    <div className="text-center mb-3">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider">
                        Jornada {p.jornada} · {p.fecha}
                      </span>
                      {!played && <div className="text-xs text-gold font-semibold mt-0.5">{p.hora}</div>}
                      {played && !pred && (
                        <div className="text-[10px] text-text-muted mt-0.5">Partido jugado · Puedes predecir para ver si hubieras acertado</div>
                      )}
                    </div>

                    {/* Teams */}
                    <div className="flex items-center gap-3">
                      <TeamButton
                        name={p.local}
                        isWinner={played && p.marcadorLocal > p.marcadorVisitante}
                        isPredicted={pred === p.local}
                        isCorrectPick={isCorrect && pred === p.local}
                        isWrongPick={isWrong && pred === p.local}
                        onClick={() => predict(p.id, p.local)}
                      />

                      <div className="text-text-muted text-xs font-bold shrink-0">VS</div>

                      <TeamButton
                        name={p.visitante}
                        isWinner={played && p.marcadorVisitante > p.marcadorLocal}
                        isPredicted={pred === p.visitante}
                        isCorrectPick={isCorrect && pred === p.visitante}
                        isWrongPick={isWrong && pred === p.visitante}
                        onClick={() => predict(p.id, p.visitante)}
                      />
                    </div>

                    {/* Played score */}
                    {played && (
                      <div className="text-center mt-3">
                        <span className={`text-lg font-bold ${p.marcadorLocal > p.marcadorVisitante ? 'gradient-text' : 'text-text-muted'}`}>{p.marcadorLocal}</span>
                        <span className="text-text-muted mx-2 text-sm">-</span>
                        <span className={`text-lg font-bold ${p.marcadorVisitante > p.marcadorLocal ? 'gradient-text' : 'text-text-muted'}`}>{p.marcadorVisitante}</span>
                      </div>
                    )}

                    {/* Hint for unplayed */}
                    {!played && !pred && (
                      <div className="text-center mt-2 text-[10px] text-text-muted">
                        Toca un equipo para predecir el ganador
                      </div>
                    )}
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

function TeamButton({ name, isWinner, isPredicted, isCorrectPick, isWrongPick, onClick }: {
  name: string;
  isWinner: boolean;
  isPredicted: boolean;
  isCorrectPick: boolean;
  isWrongPick: boolean;
  onClick: () => void;
}) {
  const color = getTeamColor(name);
  const white = isWhiteTeam(name);

  let borderClass = 'border-transparent hover:border-gold/30';
  let bgStyle: string | undefined = undefined;
  let borderStyle: string | undefined = undefined;

  if (isCorrectPick) {
    borderClass = 'border-positive';
    bgStyle = 'rgba(10, 107, 37, 0.1)';
  } else if (isWrongPick) {
    borderClass = 'border-negative';
    bgStyle = 'rgba(176, 21, 21, 0.1)';
  } else if (isPredicted) {
    borderClass = '';
    borderStyle = white ? '#CCCCCC' : color;
    bgStyle = white ? 'rgba(255,255,255,0.08)' : color + '15';
  }

  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-xl p-3 text-center transition-all duration-200 border-2 cursor-pointer active:scale-95 ${borderClass}`}
      style={{
        borderColor: borderStyle,
        background: bgStyle,
      }}
    >
      <div
        className="w-3 h-3 rounded-full mx-auto mb-1.5"
        style={{
          background: white ? '#CCCCCC' : color,
          boxShadow: isPredicted ? `0 0 8px ${color}60` : undefined,
        }}
      />
      <div className="text-xs font-bold text-text-primary truncate">{name}</div>
      {isWinner && (
        <div className="text-[9px] text-gold font-semibold mt-1">Ganador</div>
      )}
      {isPredicted && !isCorrectPick && !isWrongPick && (
        <div className="text-[9px] font-semibold mt-1" style={{ color: white ? '#666' : color }}>Tu pick</div>
      )}
      {isCorrectPick && (
        <div className="text-[9px] text-positive font-bold mt-1">✓ Acertaste</div>
      )}
      {isWrongPick && (
        <div className="text-[9px] text-negative font-bold mt-1">✗ Fallaste</div>
      )}
    </button>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold" style={{ color }}>{value}</div>
      <div className="text-[9px] text-text-muted uppercase tracking-wider">{label}</div>
    </div>
  );
}

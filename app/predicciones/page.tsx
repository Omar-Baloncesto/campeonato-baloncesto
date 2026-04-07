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

type Predictions = Record<string, string>; // matchId -> teamName

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
    const match = partidos.find(p => p.id === matchId);
    if (match && jugado(match)) return; // no permitir en partidos jugados
    const updated = { ...predictions, [matchId]: team };
    setPredictions(updated);
    savePredictions(updated);
    showToast(`Prediccion: ${team}`, 'success');
  };

  const removePrediction = (matchId: string) => {
    const match = partidos.find(p => p.id === matchId);
    if (match && jugado(match)) return;
    const updated = { ...predictions };
    delete updated[matchId];
    setPredictions(updated);
    savePredictions(updated);
    showToast('Prediccion eliminada', 'info');
  };

  const jornadas = ['Todos', ...Array.from(new Set(partidos.map(p => p.jornada)))];
  const filtrados = jornada === 'Todos' ? partidos : partidos.filter(p => p.jornada === jornada);

  // Stats
  const played = partidos.filter(jugado);
  const predicted = played.filter(p => predictions[p.id]);
  const correct = predicted.filter(p => predictions[p.id] === ganador(p));
  const wrong = predicted.filter(p => predictions[p.id] !== ganador(p));
  const pending = partidos.filter(p => !jugado(p) && predictions[p.id]);
  const pct = predicted.length > 0 ? Math.round((correct.length / predicted.length) * 100) : 0;

  return (
    <div className="animate-fade-in">
      <div className="px-4 md:px-6 pt-4 flex items-center justify-between">
        <h2 className="text-sm text-text-muted uppercase tracking-widest flex items-center gap-2">
          <span className="w-1 h-4 bg-gold rounded-full" />
          Predicciones
        </h2>
        <DataFreshness lastUpdated={lastUpdated} onRefresh={fetchData} loading={loading} />
      </div>

      {/* Stats bar */}
      {predicted.length > 0 && (
        <div className="px-4 md:px-6 pt-4">
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-text-muted uppercase tracking-widest font-semibold">Tu ranking</span>
              <span className="text-2xl font-black gradient-text">{pct}%</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-darkest)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: pct >= 70 ? 'var(--color-positive)' : pct >= 40 ? 'var(--color-gold)' : 'var(--color-negative)',
                }}
              />
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3">
              <MiniStat label="Aciertos" value={correct.length} color="var(--color-positive)" />
              <MiniStat label="Fallos" value={wrong.length} color="var(--color-negative)" />
              <MiniStat label="Pendientes" value={pending.length} color="var(--color-gold)" />
              <MiniStat label="Total" value={predicted.length} color="var(--color-text-muted)" />
            </div>
          </div>
        </div>
      )}

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
              const isWrong = played && pred && pred !== winner;

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
                      {isCorrect ? '✓ Acertaste' : '✗ Fallaste'}
                    </div>
                  )}

                  <div className="p-4">
                    {/* Date */}
                    <div className="text-center mb-3">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider">
                        Jornada {p.jornada} · {p.fecha}
                      </span>
                      {!played && <div className="text-xs text-gold font-semibold mt-0.5">{p.hora}</div>}
                    </div>

                    {/* Teams */}
                    <div className="flex items-center gap-3">
                      <TeamButton
                        name={p.local}
                        score={played ? p.marcadorLocal : undefined}
                        isWinner={played && p.marcadorLocal > p.marcadorVisitante}
                        isPredicted={pred === p.local}
                        isCorrectPick={isCorrect && pred === p.local}
                        isWrongPick={!!isWrong && pred === p.local}
                        disabled={played}
                        onClick={() => pred === p.local && !played ? removePrediction(p.id) : predict(p.id, p.local)}
                      />

                      <div className="text-text-muted text-xs font-bold shrink-0">VS</div>

                      <TeamButton
                        name={p.visitante}
                        score={played ? p.marcadorVisitante : undefined}
                        isWinner={played && p.marcadorVisitante > p.marcadorLocal}
                        isPredicted={pred === p.visitante}
                        isCorrectPick={isCorrect && pred === p.visitante}
                        isWrongPick={!!isWrong && pred === p.visitante}
                        disabled={played}
                        onClick={() => pred === p.visitante && !played ? removePrediction(p.id) : predict(p.id, p.visitante)}
                      />
                    </div>

                    {/* Played score */}
                    {played && (
                      <div className="text-center mt-3">
                        <span className="text-lg font-bold gradient-text">{p.marcadorLocal}</span>
                        <span className="text-text-muted mx-2">-</span>
                        <span className="text-lg font-bold gradient-text">{p.marcadorVisitante}</span>
                      </div>
                    )}

                    {/* Pending prediction hint */}
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

function TeamButton({ name, score, isWinner, isPredicted, isCorrectPick, isWrongPick, disabled, onClick }: {
  name: string;
  score?: number;
  isWinner: boolean;
  isPredicted: boolean;
  isCorrectPick: boolean;
  isWrongPick: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const color = getTeamColor(name);
  const white = isWhiteTeam(name);

  return (
    <button
      onClick={onClick}
      disabled={disabled && !isPredicted}
      className={`flex-1 rounded-xl p-3 text-center transition-all duration-200 border-2 ${
        isCorrectPick
          ? 'border-positive bg-positive/10'
          : isWrongPick
          ? 'border-negative bg-negative/10'
          : isPredicted
          ? 'border-gold bg-gold/10 scale-[1.02]'
          : disabled
          ? 'border-transparent opacity-70'
          : 'border-transparent hover:border-gold/30 cursor-pointer active:scale-95'
      }`}
      style={{
        borderColor: isPredicted && !isCorrectPick && !isWrongPick ? color : undefined,
        background: isPredicted && !isCorrectPick && !isWrongPick ? (white ? '#FFFFFF15' : color + '15') : undefined,
      }}
    >
      <div
        className="w-2.5 h-2.5 rounded-full mx-auto mb-1.5"
        style={{ background: white ? '#CCCCCC' : color }}
      />
      <div className="text-xs font-bold text-text-primary truncate">{name}</div>
      {isPredicted && !disabled && (
        <div className="text-[9px] text-gold font-semibold mt-1 uppercase tracking-wider">Tu pick</div>
      )}
      {isPredicted && isCorrectPick && (
        <div className="text-[9px] text-positive font-semibold mt-1">✓ Ganador</div>
      )}
      {isPredicted && isWrongPick && (
        <div className="text-[9px] text-negative font-semibold mt-1">✗ Perdedor</div>
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

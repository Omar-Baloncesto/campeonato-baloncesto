'use client';
import { useState } from 'react';
import { getTeamColor, isWhiteTeam } from '../lib/constants';
import LoadingState, { ErrorState, EmptyState } from '../components/LoadingState';
import FilterPills from '../components/FilterPills';
import DataFreshness from '../components/DataFreshness';
import ExportButton from '../components/ExportButton';
import { useToast } from '../components/ToastProvider';
import { buildFilename } from '../lib/export';
import { exportPrediccionesPdf, type PrediccionResultado } from '../lib/export-pdf';
import { exportTableXlsx } from '../lib/export-excel';
import { useSheetData } from '../lib/useSheetData';
import { parseFixtureRows, isJugado, type Partido } from '../lib/fixture';

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
  const { data, loading, error, lastUpdated, refetch } =
    useSheetData('FIXTURE', parseFixtureRows);
  const [jornada, setJornada] = useState('Todos');
  const [predictions, setPredictions] = useState<Predictions>(() =>
    typeof window !== 'undefined' ? loadPredictions() : {}
  );
  const { showToast } = useToast();
  const partidos: Partido[] = data ?? [];

  const jugado = isJugado;
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

  const resultadoFor = (p: Partido): string => {
    const pred = predictions[p.id];
    if (!pred) return 'Sin predicción';
    if (!jugado(p)) return 'Pendiente';
    return pred === ganador(p) ? 'Acertó' : 'Falló';
  };

  const marcadorFor = (p: Partido): string => {
    if (!jugado(p)) return '';
    return `${p.marcadorLocal} - ${p.marcadorVisitante}`;
  };

  const exportColumns = [
    { header: 'Jornada',        cell: (p: Partido) => p.jornada,                           align: 'center' as const, width: 12 },
    { header: 'Fecha',          cell: (p: Partido) => p.fecha,                             align: 'center' as const, width: 18 },
    { header: 'Local',          cell: (p: Partido) => p.local,                             align: 'left'   as const, width: 26 },
    { header: 'Visitante',      cell: (p: Partido) => p.visitante,                         align: 'left'   as const, width: 26 },
    { header: 'Marcador',       cell: (p: Partido) => marcadorFor(p),                      align: 'center' as const, width: 16 },
    { header: 'Mi predicción',  cell: (p: Partido) => predictions[p.id] || '',             align: 'left'   as const, width: 22 },
    { header: 'Resultado',      cell: (p: Partido) => resultadoFor(p),                     align: 'center' as const, width: 18 },
  ];

  const handleExportPdf = async (destination: "download" | "whatsapp" | "share") => {
    const resultadoCode = (p: Partido): PrediccionResultado => {
      const pred = predictions[p.id];
      if (!pred) return 'sin-prediccion';
      if (!jugado(p)) return 'pendiente';
      return pred === ganador(p) ? 'acerto' : 'fallo';
    };
    await exportPrediccionesPdf({
      subtitle: jornada === 'Todos' ? 'Predicciones' : `Predicciones · Jornada ${jornada}`,
      filename: buildFilename(`predicciones${jornada === 'Todos' ? '' : '-j' + jornada}`),
      stats: {
        aciertos: correct.length,
        fallos: wrong.length,
        pendientes: pending.length,
        predicciones: totalPredicted,
        pct,
      },
      partidos: filtrados.map((p) => ({
        jornada: p.jornada,
        fecha: p.fecha,
        hora: p.hora,
        local: p.local,
        colorLocal: getTeamColor(p.local),
        visitante: p.visitante,
        colorVisitante: getTeamColor(p.visitante),
        marcadorLocal: p.marcadorLocal != null ? String(p.marcadorLocal) : '',
        marcadorVisitante: p.marcadorVisitante != null ? String(p.marcadorVisitante) : '',
        jugado: jugado(p),
        miPrediccion: predictions[p.id] || '',
        resultado: resultadoCode(p),
      })),
      destination,
    });
  };

  const handleExportExcel = async (destination: "download" | "whatsapp" | "share") => {
    await exportTableXlsx({
      filename: buildFilename('predicciones'),
      sheetName: 'Predicciones',
      titleRows: ['Campeonato Baloncesto · Cúcuta 2026', 'Predicciones'],
      columns: exportColumns,
      rows: filtrados,
      destination,
    });
  };

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
        <div className="flex items-center gap-3">
          <ExportButton
            onExportPdf={handleExportPdf}
            onExportExcel={handleExportExcel}
            disabled={loading || error || filtrados.length === 0}
          />
          <DataFreshness lastUpdated={lastUpdated} onRefresh={refetch} loading={loading} />
        </div>
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
          <ErrorState onRetry={refetch} />
        ) : filtrados.length === 0 ? (
          <EmptyState message="No hay partidos para esta jornada." />
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

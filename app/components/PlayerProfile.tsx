'use client';

import { useEffect, useState, useCallback } from 'react';
import { TEAMS, TeamConfig } from '../lib/constants';

interface PlayerData {
  nombre: string;
  numero: string;
  posicion: string;
  equipoId: string;
}

interface PlayerStats {
  totalPuntos: number;
  asistencias: number;
  promedio: number;
}

interface PointBreakdown {
  p1: number;
  p2: number;
  p3: number;
  total: number;
}

interface AttendanceData {
  fechas: string[];
  asistencia: number;
  totalFechas: number;
  porcentaje: string;
}

const FECHAS_LABELS = ['21/02', '28/02', '7/03', '14/03', '26/03', '11/04', '18/04', '25/04', '2/05', '9/05'];

const EQUIPOS_PUNTOS = [
  { nombre: 'Miami Heat', filaInicio: 2, filaFin: 12 },
  { nombre: 'Brooklyn Nets', filaInicio: 16, filaFin: 25 },
  { nombre: 'Boston Celtics', filaInicio: 30, filaFin: 40 },
  { nombre: 'Oklahoma City Thunder', filaInicio: 44, filaFin: 53 },
  { nombre: 'Los Angeles Lakers', filaInicio: 58, filaFin: 68 },
  { nombre: 'Toronto Raptors', filaInicio: 72, filaFin: 81 },
];

const EQUIPOS_ASISTENCIA = [
  { nombre: 'Miami Heat', inicio: 4, fin: 14 },
  { nombre: 'Brooklyn Nets', inicio: 22, fin: 31 },
  { nombre: 'Boston Celtics', inicio: 40, fin: 50 },
  { nombre: 'Oklahoma City Thunder', inicio: 58, fin: 68 },
  { nombre: 'Los Angeles Lakers', inicio: 76, fin: 86 },
  { nombre: 'Toronto Raptors', inicio: 93, fin: 103 },
];

interface Props {
  player: PlayerData;
  team: TeamConfig;
  onClose: () => void;
}

export default function PlayerProfile({ player, team, onClose }: Props) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [breakdown, setBreakdown] = useState<PointBreakdown | null>(null);
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);

  const color = team.safeColor;
  const isWhite = team.color === '#FFFFFF';

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [ptsRes, attRes] = await Promise.all([
          fetch('/api/sheets?sheet=PuntosJugadores').then(r => r.json()),
          fetch('/api/sheets?sheet=AsistenciasJugadores').then(r => r.json()),
        ]);

        // Find player stats (columns 7-10: nombre, totalPuntos, asistencias, promedio)
        if (ptsRes.success) {
          const rows = ptsRes.data;
          const statsRow = rows.slice(1).find(
            (r: string[]) => r[7] && r[7].trim() === player.nombre.trim()
          );
          if (statsRow) {
            setStats({
              totalPuntos: parseFloat(statsRow[8]) || 0,
              asistencias: parseFloat(statsRow[9]) || 0,
              promedio: parseFloat(statsRow[10]) || 0,
            });
          }

          // Find point breakdown by team section
          const teamConfig = EQUIPOS_PUNTOS.find(e => e.nombre === team.name);
          if (teamConfig) {
            const teamRows = rows.slice(teamConfig.filaInicio - 1, teamConfig.filaFin);
            const playerRow = teamRows.find(
              (r: string[]) => r[0] && r[0].trim() === player.nombre.trim()
            );
            if (playerRow) {
              setBreakdown({
                p1: parseInt(playerRow[1]) || 0,
                p2: parseInt(playerRow[2]) || 0,
                p3: parseInt(playerRow[3]) || 0,
                total: parseInt(playerRow[4]) || 0,
              });
            }
          }
        }

        // Find attendance data
        if (attRes.success) {
          const rows = attRes.data;
          const teamConfig = EQUIPOS_ASISTENCIA.find(e => e.nombre === team.name);
          if (teamConfig) {
            const teamRows = rows.slice(teamConfig.inicio - 1, teamConfig.fin);
            const playerRow = teamRows.find(
              (r: string[]) => r[0] && r[0].trim() === player.nombre.trim()
            );
            if (playerRow) {
              setAttendance({
                fechas: [playerRow[1], playerRow[2], playerRow[3], playerRow[4], playerRow[5],
                         playerRow[6], playerRow[7], playerRow[8], playerRow[9], playerRow[10]],
                asistencia: parseInt(playerRow[11]) || 0,
                totalFechas: parseInt(playerRow[12]) || 0,
                porcentaje: playerRow[14] || '0%',
              });
            }
          }
        }
      } catch (e) {
        console.error('Error fetching player data:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [player.nombre, team.name]);

  const pctNum = attendance ? parseFloat(attendance.porcentaje) : 0;
  const pctColor = pctNum >= 80 ? 'text-positive' : pctNum >= 50 ? 'text-gold' : 'text-negative';

  const maxPts = breakdown ? Math.max(breakdown.p1, breakdown.p2, breakdown.p3, 1) : 1;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm menu-overlay" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-bg-primary border border-border-light rounded-t-2xl sm:rounded-2xl menu-panel">
        {/* Header with team color accent */}
        <div
          className="sticky top-0 z-10 px-5 pt-5 pb-4 rounded-t-2xl"
          style={{
            background: `linear-gradient(135deg, ${isWhite ? '#e8e8e8' : color + '25'}, var(--color-bg-primary))`,
            borderBottom: `2px solid ${color}`,
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-center gap-4">
            {/* Jersey number badge */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black shrink-0"
              style={{
                background: isWhite ? '#FFFFFF' : `linear-gradient(135deg, ${color}40, ${color}15)`,
                border: `3px solid ${color}`,
                color: isWhite ? '#000000' : color,
                boxShadow: `0 4px 20px ${color}30`,
              }}
            >
              {player.numero || '?'}
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold text-text-primary leading-tight truncate">{player.nombre}</div>
              <div className="text-sm font-semibold mt-1" style={{ color: isWhite ? '#666' : color }}>
                {team.name}
              </div>
              <div className="text-xs text-text-muted mt-0.5">{player.posicion || 'Sin posicion'}</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 pb-6 pt-4 space-y-5">
          {loading ? (
            <div className="text-center py-12">
              <div className="spinner mx-auto mb-3" />
              <span className="text-sm text-text-muted">Cargando estadisticas...</span>
            </div>
          ) : (
            <>
              {/* Quick stats */}
              {stats && (
                <div>
                  <SectionTitle>Estadisticas generales</SectionTitle>
                  <div className="grid grid-cols-3 gap-3">
                    <StatCard label="Puntos" value={String(stats.totalPuntos)} accent={color} />
                    <StatCard label="Asistencias" value={String(stats.asistencias)} accent={color} />
                    <StatCard label="Promedio" value={stats.promedio.toFixed(1)} accent={color} />
                  </div>
                </div>
              )}

              {/* Points breakdown chart */}
              {breakdown && (
                <div>
                  <SectionTitle>Desglose de puntos</SectionTitle>
                  <div className="glass-card rounded-xl p-4 space-y-3">
                    <div className="text-center mb-2">
                      <span className="text-3xl font-black gradient-text">{breakdown.total}</span>
                      <span className="text-xs text-text-muted ml-1">pts totales</span>
                    </div>
                    <BarRow label="Puntos de 1" value={breakdown.p1} max={maxPts} color={color} />
                    <BarRow label="Puntos de 2" value={breakdown.p2} max={maxPts} color={color} />
                    <BarRow label="Puntos de 3" value={breakdown.p3} max={maxPts} color={color} />
                  </div>
                </div>
              )}

              {/* Attendance */}
              {attendance && (
                <div>
                  <SectionTitle>Asistencia</SectionTitle>
                  <div className="glass-card rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-text-muted">
                        {attendance.asistencia} de {attendance.totalFechas} fechas
                      </span>
                      <span className={`text-lg font-bold ${pctColor}`}>{attendance.porcentaje}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-2.5 bg-bg-darkest rounded-full overflow-hidden mb-4">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pctNum}%`,
                          background: `linear-gradient(90deg, ${color}, ${color}aa)`,
                        }}
                      />
                    </div>
                    {/* Date dots */}
                    <div className="grid grid-cols-5 gap-2">
                      {attendance.fechas.map((f, i) => (
                        <div key={i} className="text-center">
                          <div
                            className={`w-full aspect-square rounded-lg flex items-center justify-center text-xs font-bold ${
                              f === '1' ? 'bg-positive/20 text-positive' :
                              f === '0' && i < attendance.totalFechas ? 'bg-negative/20 text-negative' :
                              'bg-bg-darkest/50 text-text-muted/40'
                            }`}
                          >
                            {f === '1' ? '✓' : f === '0' && i < attendance.totalFechas ? '✗' : '—'}
                          </div>
                          <div className="text-[9px] text-text-muted mt-1">{FECHAS_LABELS[i]}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!stats && !breakdown && !attendance && (
                <div className="text-center py-8 text-text-muted text-sm">
                  No hay estadisticas disponibles para este jugador.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] text-text-muted uppercase tracking-widest mb-2 font-semibold">{children}</h3>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="glass-card rounded-xl p-3 text-center">
      <div className="text-2xl font-black" style={{ color: accent }}>{value}</div>
      <div className="text-[10px] text-text-muted uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-muted">{label}</span>
        <span className="text-sm font-bold text-text-primary">{value}</span>
      </div>
      <div className="h-3 bg-bg-darkest rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}bb)` }}
        />
      </div>
    </div>
  );
}

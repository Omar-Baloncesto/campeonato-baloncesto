'use client';
import { useEffect, useState } from 'react';
import { TEAMS } from './lib/constants';
import { ErrorState } from './components/LoadingState';
import DataFreshness from './components/DataFreshness';

interface Equipo {
  id: string;
  nombre: string;
  hexColor: string;
}

export default function Dashboard() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [totalJugadores, setTotalJugadores] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = () => {
    setLoading(true);
    setError(false);

    Promise.all([
      fetch('/api/sheets?sheet=EQUIPOS').then(r => r.json()),
      fetch('/api/sheets?sheet=JUGADORES').then(r => r.json()),
    ])
      .then(([eqData, jugData]) => {
        if (eqData.success && eqData.data.length > 1) {
          const rows = eqData.data.slice(1).filter((r: string[]) => r[1]);
          setEquipos(rows.map((r: string[]) => ({
            id: r[0], nombre: r[1], hexColor: r[5] || '#888888',
          })));
        }
        if (jugData.success && jugData.data.length > 1) {
          setTotalJugadores(jugData.data.slice(1).filter((r: string[]) => r[1]).length);
        }
        if (!eqData.success && !jugData.success) setError(true);
        else setLastUpdated(new Date());
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, []);

  const initiales = (nombre: string) =>
    nombre.split(' ').slice(0, 2).map(w => w[0]).join('');

  const badgeColor = (eq: Equipo) => TEAMS[eq.id]?.safeColor || eq.hexColor;

  const stats = [
    { value: '6', label: 'Equipos', icon: '🏀' },
    { value: '10', label: 'Partidos', icon: '🗓' },
    { value: loading ? '...' : String(totalJugadores), label: 'Jugadores', icon: '👥' },
    { value: '2', label: 'Rondas', icon: '🏆' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Stats bar with icons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-bg-darkest border-b border-border-light">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="bg-bg-secondary px-4 py-4 md:px-5 md:py-5 text-center group hover:bg-bg-card transition-colors relative overflow-hidden"
          >
            {/* Subtle gradient accent */}
            <div className="absolute inset-0 bg-gradient-to-b from-gold/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="text-lg mb-1 opacity-60">{s.icon}</div>
              <div className="text-2xl md:text-3xl font-bold gradient-text count-up" style={{ animationDelay: `${i * 100}ms` }}>
                {s.value}
              </div>
              <div className="text-[11px] text-text-muted uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Team cards */}
      <section className="p-4 md:p-6" aria-label="Equipos participantes">
        <div className="glass-card rounded-xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm text-text-muted uppercase tracking-widest flex items-center gap-2">
              <span className="w-1 h-4 bg-gold rounded-full" />
              Equipos participantes
            </h2>
            <DataFreshness lastUpdated={lastUpdated} onRefresh={fetchData} loading={loading} />
          </div>

          {loading ? (
            <div className="text-text-muted text-center py-12">
              <div className="spinner mx-auto mb-4" />
              <span className="text-sm tracking-wide">Cargando equipos...</span>
            </div>
          ) : error ? (
            <ErrorState
              message="No se pudieron cargar los equipos. Verifica tu conexion a internet."
              onRetry={fetchData}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-children">
              {equipos.map(eq => {
                const color = badgeColor(eq);
                const isWhite = eq.hexColor === '#FFFFFF' || eq.hexColor === '#ffffff';
                return (
                  <div
                    key={eq.id}
                    className="bg-bg-primary/80 rounded-xl p-4 flex items-center gap-3.5 border border-border-light glow-hover cursor-pointer group"
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-transform group-hover:scale-105"
                      style={{
                        background: isWhite ? '#FFFFFF' : `linear-gradient(135deg, ${color}30, ${color}10)`,
                        color: isWhite ? '#000000' : color,
                        border: `1.5px solid ${color}50`,
                        boxShadow: `0 2px 8px ${color}15`,
                      }}
                    >
                      {initiales(eq.nombre)}
                    </div>
                    <div>
                      <div className="text-sm font-medium group-hover:text-text-primary transition-colors">{eq.nombre}</div>
                      <div className="text-[11px] text-text-muted mt-0.5">Cucuta</div>
                    </div>
                    {/* Chevron on hover */}
                    <svg className="w-4 h-4 text-text-muted/0 group-hover:text-text-muted/50 ml-auto transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

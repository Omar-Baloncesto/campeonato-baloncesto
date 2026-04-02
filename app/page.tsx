'use client';
import { useEffect, useState } from 'react';
import { TEAMS } from './lib/constants';

interface Equipo {
  id: string;
  nombre: string;
  hexColor: string;
}

export default function Dashboard() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [totalJugadores, setTotalJugadores] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sheets?sheet=EQUIPOS')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data.length > 1) {
          const rows = data.data.slice(1).filter((r: string[]) => r[1]);
          setEquipos(rows.map((r: string[]) => ({
            id: r[0],
            nombre: r[1],
            hexColor: r[5] || '#888888',
          })));
        }
      });

    fetch('/api/sheets?sheet=JUGADORES')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data.length > 1) {
          const jugadores = data.data.slice(1).filter((r: string[]) => r[1]);
          setTotalJugadores(jugadores.length);
        }
        setLoading(false);
      });
  }, []);

  const initiales = (nombre: string) =>
    nombre.split(' ').slice(0, 2).map(w => w[0]).join('');

  const badgeColor = (eq: Equipo) => {
    const team = TEAMS[eq.id];
    return team?.safeColor || eq.hexColor;
  };

  const stats = [
    ['6', 'Equipos'],
    ['10', 'Partidos'],
    [loading ? '...' : String(totalJugadores), 'Jugadores'],
    ['2', 'Rondas'],
  ];

  return (
    <div className="animate-fade-in">
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-bg-darkest border-b border-border-light">
        {stats.map(([n, l]) => (
          <div key={l} className="bg-bg-secondary px-4 py-3 md:px-5 md:py-3.5 text-center">
            <div className="text-2xl md:text-3xl font-bold text-gold">{n}</div>
            <div className="text-[11px] text-text-muted uppercase tracking-wide mt-1">{l}</div>
          </div>
        ))}
      </div>

      {/* Team cards */}
      <section className="p-4 md:p-6" aria-label="Equipos participantes">
        <div className="bg-bg-secondary rounded-xl p-4 md:p-5">
          <h2 className="text-sm text-text-muted uppercase tracking-widest mb-4">
            Equipos participantes
          </h2>

          {loading ? (
            <div className="text-text-muted text-center py-10">
              <div className="spinner mx-auto mb-3" />
              <span className="text-sm">Cargando equipos...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {equipos.map((eq, i) => {
                const color = badgeColor(eq);
                const isWhite = eq.hexColor === '#FFFFFF' || eq.hexColor === '#ffffff';
                return (
                  <div
                    key={eq.id}
                    className="bg-bg-primary rounded-lg p-3.5 flex items-center gap-3 border border-border-light cursor-pointer transition-all duration-150 hover:border-gold/20 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gold/5"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[13px] shrink-0"
                      style={{
                        background: isWhite ? '#FFFFFF' : color + '30',
                        color: isWhite ? '#000000' : color,
                        border: `1px solid ${color}50`,
                      }}
                    >
                      {initiales(eq.nombre)}
                    </div>
                    <div>
                      <div className="text-[13px] font-medium">{eq.nombre}</div>
                      <div className="text-[11px] text-text-muted">Cúcuta</div>
                    </div>
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

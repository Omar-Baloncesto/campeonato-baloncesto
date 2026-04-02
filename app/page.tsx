'use client';
import { useEffect, useState } from 'react';

interface Equipo {
  id: string;
  nombre: string;
  hexColor: string;
}

const COLORES_EQUIPO: Record<string, string> = {
  '1': '#FFFFFF',
  '2': '#AAAAAA', 
  '3': '#00FF00',
  '4': '#00BFFF',
  '5': '#FFD700',
  '6': '#FF0000',
};

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
    const hex = eq.hexColor;
    if (hex === '#FFFFFF' || hex === '#ffffff') return '#CCCCCC';
    if (hex === '#000000') return '#AAAAAA';
    return hex;
  };

  return (
    <main style={{ background: '#1a1a2e', minHeight: '100vh', fontFamily: 'sans-serif', color: '#f0ece3' }}>

      {/* HEADER */}
      <div style={{ background: '#16213e', borderBottom: '2px solid #F5B800', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 36 }}>🏀</span>
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#F5B800', letterSpacing: 2 }}>CAMPEONATO BALONCESTO</div>
            <div style={{ fontSize: 12, color: '#8a8a9a', letterSpacing: 1 }}>CÚCUTA · TEMPORADA 2026</div>
          </div>
        </div>
        <div style={{ background: '#e63946', color: 'white', fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20, letterSpacing: 1 }}>EN VIVO</div>
      </div>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: '#0a0a1a', borderBottom: '1px solid #ffffff10' }}>
        {[
          ['6', 'Equipos'],
          ['10', 'Partidos'],
          [loading ? '...' : String(totalJugadores), 'Jugadores'],
          ['2', 'Rondas'],
        ].map(([n, l]) => (
          <div key={l} style={{ background: '#16213e', padding: '14px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 30, fontWeight: 700, color: '#F5B800' }}>{n}</div>
            <div style={{ fontSize: 11, color: '#8a8a9a', textTransform: 'uppercase', letterSpacing: 1, marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* NAV */}
<div style={{ padding: '16px 24px 0', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
  {[
    { label: 'Equipos',      href: '/' },
    { label: 'Posiciones',   href: '/posiciones' },
    { label: 'Fixture',      href: '/fixture' },
    { label: 'Jugadores',    href: '/jugadores' },
    { label: 'Estadísticas', href: '/estadisticas' },
    { label: 'Est. Equipos', href: '/estadisticas-equipos' },
    { label: 'Asistencias',  href: '/asistencias' },
    { label: 'Marcadores',   href: '/lista-equipos' },
    { label: 'Bracket',      href: '/bracket' },
  ].map((item) => (
    <a key={item.href} href={item.href} style={{
      padding: '8px 16px', fontSize: 13, color: '#8a8a9a',
      borderBottom: '2px solid transparent', cursor: 'pointer',
      textDecoration: 'none', whiteSpace: 'nowrap',
    }}>
      {item.label}
    </a>
  ))}
</div>

      {/* CONTENT */}
      <div style={{ background: '#16213e', margin: '0 24px', borderRadius: '0 12px 12px 12px', padding: 20 }}>
        <div style={{ fontSize: 14, color: '#8a8a9a', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 14 }}>Equipos participantes</div>

        {loading ? (
          <div style={{ color: '#8a8a9a', textAlign: 'center', padding: 40 }}>Cargando equipos...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {equipos.map(eq => (
              <div key={eq.id} style={{ background: '#1a1a2e', borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #ffffff08', cursor: 'pointer' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: eq.hexColor === '#FFFFFF' ? '#FFFFFF' : badgeColor(eq) + '30', color: eq.hexColor === '#FFFFFF' || eq.hexColor === '#ffffff' ? '#000000' : badgeColor(eq), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0, border: `1px solid ${badgeColor(eq)}50` }}>
                  {initiales(eq.nombre)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{eq.nombre}</div>
                  <div style={{ fontSize: 11, color: '#8a8a9a' }}>Cúcuta</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: 16, textAlign: 'center', fontSize: 11, color: '#8a8a9a', letterSpacing: 2 }}>
        CAMPEONATO · BALONCESTO · CÚCUTA 2026
      </div>
    </main>
  );
}
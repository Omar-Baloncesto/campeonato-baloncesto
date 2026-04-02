'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Jugador {
  id: string;
  nombre: string;
  equipoId: string;
  numero: string;
  posicion: string;
}

const EQUIPOS: Record<string, { nombre: string; color: string }> = {
  '1': { nombre: 'Miami Heat', color: '#CCCCCC' },
  '2': { nombre: 'Brooklyn Nets', color: '#C0C0C0' },
  '3': { nombre: 'Boston Celtics', color: '#00FF00' },
  '4': { nombre: 'Oklahoma City Thunder', color: '#00BFFF' },
  '5': { nombre: 'Los Angeles Lakers', color: '#FFD700' },
  '6': { nombre: 'Toronto Raptors', color: '#FF0000' },
};

export default function Jugadores() {
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [equipoFiltro, setEquipoFiltro] = useState('Todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sheets?sheet=JUGADORES')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data.length > 1) {
          const rows = data.data.slice(1).filter((r: string[]) => r[1]);
          setJugadores(rows.map((r: string[]) => ({
            id: r[0], nombre: r[1], equipoId: r[2],
            numero: r[3], posicion: r[4],
          })));
        }
        setLoading(false);
      });
  }, []);

  const equiposIds = ['Todos', ...Object.keys(EQUIPOS)];
  const filtrados = equipoFiltro === 'Todos'
    ? [...jugadores].sort((a, b) => Number(a.equipoId) - Number(b.equipoId))
    : jugadores.filter(j => j.equipoId === equipoFiltro);

  return (
    <main style={{ background: '#1a1a2e', minHeight: '100vh', fontFamily: 'sans-serif', color: '#f0ece3' }}>

      {/* HEADER */}
      <div style={{ background: '#16213e', borderBottom: '2px solid #F5B800', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/" style={{ color: '#8a8a9a', textDecoration: 'none', fontSize: 13 }}>← Inicio</Link>
          <span style={{ color: '#333' }}>|</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#F5B800', letterSpacing: 2 }}>👤 JUGADORES</span>
        </div>
        <div style={{ fontSize: 12, color: '#8a8a9a' }}>{filtrados.length} jugadores</div>
      </div>

      {/* FILTRO EQUIPOS */}
      <div style={{ padding: '16px 24px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {equiposIds.map(id => {
          const eq = EQUIPOS[id];
          return (
            <button key={id} onClick={() => setEquipoFiltro(id)}
              style={{ padding: '6px 14px', borderRadius: 20, border: equipoFiltro === id ? `2px solid ${eq?.color || '#F5B800'}` : '2px solid transparent', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                background: equipoFiltro === id ? (eq?.color || '#F5B800') + '20' : '#16213e',
                color: equipoFiltro === id ? (eq?.color || '#F5B800') : '#8a8a9a' }}>
              {id === 'Todos' ? 'Todos' : eq.nombre}
            </button>
          );
        })}
      </div>

      {/* JUGADORES */}
      <div style={{ padding: '0 24px 32px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#8a8a9a', padding: 60 }}>Cargando jugadores...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
            {filtrados.map(j => {
              const eq = EQUIPOS[j.equipoId];
              const color = eq?.color || '#888';
              return (
                <div key={j.id} style={{ background: '#16213e', borderRadius: 12, padding: 16, border: `1px solid ${color}20`, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: j.equipoId === '1' ? '#FFFFFF' : color + '25', border: `2px solid ${color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: j.equipoId === '1' ? '#000000' : color, flexShrink: 0 }}>
                    {j.numero || '?'}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>{j.nombre}</div>
                    <div style={{ fontSize: 11, color: color, marginTop: 3 }}>{eq?.nombre || 'Equipo ' + j.equipoId}</div>
                    <div style={{ fontSize: 10, color: '#8a8a9a' }}>{j.posicion}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

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

const COLORES: Record<string, string> = {
  'Miami Heat': '#FFFFFF',
  'Brooklyn Nets': '#C0C0C0',
  'Boston Celtics': '#00FF00',
  'Oklahoma City Thunder': '#00BFFF',
  'Los Angeles Lakers': '#FFD700',
  'Toronto Raptors': '#FF0000',
};

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

  const colorEquipo = (nombre: string) => COLORES[nombre] || '#888';

  return (
    <main style={{ background: '#1a1a2e', minHeight: '100vh', fontFamily: 'sans-serif', color: '#f0ece3' }}>

      {/* HEADER */}
      <div style={{ background: '#16213e', borderBottom: '2px solid #F5B800', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/" style={{ color: '#8a8a9a', textDecoration: 'none', fontSize: 13 }}>← Inicio</Link>
          <span style={{ color: '#333' }}>|</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#F5B800', letterSpacing: 2 }}>🗓 FIXTURE</span>
        </div>
        <div style={{ fontSize: 12, color: '#8a8a9a' }}>  {loading ? 'Cargando...' : `${partidos.filter(jugado).length} jugados · ${partidos.filter(p => !jugado(p)).length} pendientes`}</div>
      </div>

      {/* FILTRO JORNADAS */}
      <div style={{ padding: '16px 24px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {jornadas.map(j => (
          <button key={j} onClick={() => setJornada(j)}
            style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
              background: jornada === j ? '#F5B800' : '#16213e',
              color: jornada === j ? '#1a1a2e' : '#8a8a9a' }}>
            {j === 'Todos' ? 'Todos' : `Jornada ${j}`}
          </button>
        ))}
      </div>

      {/* PARTIDOS */}
      <div style={{ padding: '0 24px 32px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#8a8a9a', padding: 60 }}>Cargando fixture...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtrados.map(p => (
              <div key={p.id} style={{ background: '#16213e', borderRadius: 12, padding: '16px 20px', border: `1px solid ${jugado(p) ? '#F5B80030' : '#ffffff08'}`, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}>

                {/* LOCAL */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: colorEquipo(p.local), flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{p.local}</span>
                </div>

                {/* MARCADOR / HORA */}
                <div style={{ textAlign: 'center', minWidth: 100 }}>
                  {jugado(p) ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                      <span style={{ fontSize: 22, fontWeight: 700, color: p.marcadorLocal > p.marcadorVisitante ? '#F5B800' : '#f0ece3' }}>{p.marcadorLocal}</span>
                      <span style={{ color: '#8a8a9a', fontSize: 12 }}>—</span>
                      <span style={{ fontSize: 22, fontWeight: 700, color: p.marcadorVisitante > p.marcadorLocal ? '#F5B800' : '#f0ece3' }}>{p.marcadorVisitante}</span>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#F5B800' }}>{p.hora}</div>
                      <div style={{ fontSize: 11, color: '#8a8a9a' }}>{p.fecha}</div>
                    </div>
                  )}
                  {jugado(p) && <div style={{ fontSize: 10, color: '#8a8a9a', marginTop: 2 }}>{p.fecha}</div>}
                </div>

                {/* VISITANTE */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{p.visitante}</span>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: colorEquipo(p.visitante), flexShrink: 0 }} />
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
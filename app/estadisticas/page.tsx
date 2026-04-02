'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Jugador {
  nombre: string;
  totalPuntos: string;
  asistencias: string;
  promedio: string;
}

export default function Estadisticas() {
    const [jugadores, setJugadores] = useState<Jugador[]>([]);
    const [maximos, setMaximos] = useState<string[][]>([]);
    const [loading, setLoading] = useState(true);
    const [orden, setOrden] = useState<'totalPuntos' | 'asistencias' | 'promedio'>('totalPuntos');

  useEffect(() => {
    fetch('/api/sheets?sheet=PuntosJugadores')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data.length > 1) {
          const rows = data.data.slice(1).filter((r: string[]) => r[7] && r[7] !== 'NOMBRE JUGADOR');
          setJugadores(rows.map((r: string[]) => ({
            nombre: r[7],
            totalPuntos: r[8] || '0',
            asistencias: r[9] || '0',
            promedio: r[10] || '0',
          })));
        const maxRows = data.data.filter((r: string[]) => r[0] && r[0].toString().includes('Jugador'));setMaximos(maxRows.map((r: string[]) => [r[0], r[1], r[4]]));
        }

        setLoading(false);
      });
  }, []);

  const ordenados = [...jugadores].sort((a, b) =>
    parseFloat(b[orden]) - parseFloat(a[orden])
  );

  return (
    <main style={{ background: '#1a1a2e', minHeight: '100vh', fontFamily: 'sans-serif', color: '#f0ece3' }}>

      {/* HEADER */}
      <div style={{ background: '#16213e', borderBottom: '2px solid #F5B800', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/" style={{ color: '#8a8a9a', textDecoration: 'none', fontSize: 13 }}>← Inicio</Link>
          <span style={{ color: '#333' }}>|</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#F5B800', letterSpacing: 2 }}>📊 ESTADÍSTICAS</span>
        </div>
        <div style={{ fontSize: 12, color: '#8a8a9a' }}>{jugadores.length} jugadores</div>
      </div>

      {/* FILTROS */}
      <div style={{ padding: '16px 24px', display: 'flex', gap: 8 }}>
        {[
          { key: 'totalPuntos', label: '🏀 Puntos' },
          { key: 'asistencias', label: '🤝 Asistencias' },
          { key: 'promedio', label: '📈 Promedio' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setOrden(key as any)}
            style={{ padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
              background: orden === key ? '#F5B800' : '#16213e',
              color: orden === key ? '#1a1a2e' : '#8a8a9a' }}>
            {label}
          </button>
        ))}
      </div>

      {/* TABLA */}
      <div style={{ padding: '0 24px 32px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#8a8a9a', padding: 60 }}>Cargando estadísticas...</div>
        ) : (
          <div style={{ background: '#16213e', borderRadius: 12, overflow: 'hidden' }}>

            {/* ENCABEZADO */}
            <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 100px 100px 100px', padding: '12px 20px', background: '#0f3460', fontSize: 11, color: '#8a8a9a', textTransform: 'uppercase', letterSpacing: 1, gap: 8 }}>
              <div>#</div>
              <div>Jugador</div>
              <div style={{ textAlign: 'center' }}>Puntos</div>
              <div style={{ textAlign: 'center' }}>Asistencias</div>
              <div style={{ textAlign: 'center' }}>Promedio</div>
            </div>

            {/* FILAS */}
            {ordenados.map((j, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 100px 100px 100px', padding: '12px 20px', borderBottom: '1px solid #ffffff08', alignItems: 'center', gap: 8, background: i % 2 === 0 ? '#16213e' : '#1a2744' }}>
                <div style={{ fontSize: 14, color: i === 0 ? '#F5B800' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#8a8a9a', fontWeight: 700 }}>
                  {i + 1}°
                </div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{j.nombre}</div>
                <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: orden === 'totalPuntos' ? '#F5B800' : '#f0ece3' }}>{j.totalPuntos}</div>
                <div style={{ textAlign: 'center', fontSize: 14, fontWeight: orden === 'asistencias' ? 700 : 400, color: orden === 'asistencias' ? '#F5B800' : '#f0ece3' }}>{j.asistencias}</div>
                <div style={{ textAlign: 'center', fontSize: 14, fontWeight: orden === 'promedio' ? 700 : 400, color: orden === 'promedio' ? '#F5B800' : '#f0ece3' }}>{j.promedio}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* MÁXIMOS */}
{maximos.length > 0 && (
  <div style={{ padding: '0 24px 32px' }}>
    <div style={{ background: '#16213e', borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 14, color: '#8a8a9a', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>🏆 Jugadores con máximos puntos</div>
      {maximos.map((r, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #ffffff08' }}>
          <div style={{ fontSize: 13, color: '#8a8a9a' }}>{r[0]}</div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#f0ece3' }}>{r[1]}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#F5B800', minWidth: 50, textAlign: 'right' }}>{r[2]}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
    </main>
  );
}
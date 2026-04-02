'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface JugadorEquipo {
  nombre: string;
  p1: string;
  p2: string;
  p3: string;
  total: string;
}

interface Equipo {
  nombre: string;
  color: string;
  jugadores: JugadorEquipo[];
}

const EQUIPOS_CONFIG = [
  { nombre: 'Miami Heat', color: '#FFFFFF', filaInicio: 2, filaFin: 12 },
  { nombre: 'Brooklyn Nets', color: '#AAAAAA', filaInicio: 16, filaFin: 25 },
  { nombre: 'Boston Celtics', color: '#00FF00', filaInicio: 30, filaFin: 40 },
  { nombre: 'Oklahoma City Thunder', color: '#00BFFF', filaInicio: 44, filaFin: 53 },
  { nombre: 'Los Angeles Lakers', color: '#FFD700', filaInicio: 58, filaFin: 68 },
  { nombre: 'Toronto Raptors', color: '#FF0000', filaInicio: 72, filaFin: 81 },
];

export default function EstadisticasEquipos() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [equipoActivo, setEquipoActivo] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sheets?sheet=PuntosJugadores')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data.length > 1) {
          const rows = data.data;
          const result = EQUIPOS_CONFIG.map(eq => ({
            nombre: eq.nombre,
            color: eq.color,
            jugadores: rows
              .slice(eq.filaInicio - 1, eq.filaFin)
              .filter((r: string[]) => r[0] && r[0] !== eq.nombre)
              .map((r: string[]) => ({
                nombre: r[0], p1: r[1] || '0',
                p2: r[2] || '0', p3: r[3] || '0', total: r[4] || '0',
              }))
          }));
          setEquipos(result);
        }
        setLoading(false);
      });
  }, []);

  const eq = equipos[equipoActivo];

  return (
    <main style={{ background: '#1a1a2e', minHeight: '100vh', fontFamily: 'sans-serif', color: '#f0ece3' }}>

      {/* HEADER */}
      <div style={{ background: '#16213e', borderBottom: '2px solid #F5B800', padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <Link href="/" style={{ color: '#8a8a9a', textDecoration: 'none', fontSize: 13 }}>← Inicio</Link>
        <span style={{ color: '#333' }}>|</span>
        <span style={{ fontSize: 22, fontWeight: 700, color: '#F5B800', letterSpacing: 2 }}>📊 ESTADÍSTICAS POR EQUIPO</span>
      </div>

      {/* TABS EQUIPOS */}
      <div style={{ padding: '16px 24px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {equipos.map((e, i) => (
          <button key={i} onClick={() => setEquipoActivo(i)}
            style={{ padding: '6px 14px', borderRadius: 20, border: equipoActivo === i ? `2px solid ${e.color === '#FFFFFF' ? '#CCCCCC' : e.color}` : '2px solid transparent',
              cursor: 'pointer', fontSize: 12, fontWeight: 500,
              background: equipoActivo === i ? (e.color === '#FFFFFF' ? '#FFFFFF' : e.color + '20') : '#16213e',
              color: equipoActivo === i ? (e.color === '#FFFFFF' ? '#000000' : e.color) : '#8a8a9a' }}>
            {e.nombre}
          </button>
        ))}
      </div>

      {/* TABLA */}
      <div style={{ padding: '0 24px 32px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#8a8a9a', padding: 60 }}>Cargando...</div>
        ) : eq ? (
          <div style={{ background: '#16213e', borderRadius: 12, overflow: 'hidden' }}>

            {/* HEADER EQUIPO */}
            <div style={{ padding: '16px 20px', background: eq.color === '#FFFFFF' ? '#FFFFFF' : eq.color + '20', borderBottom: `2px solid ${eq.color === '#FFFFFF' ? '#CCCCCC' : eq.color}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: eq.color === '#FFFFFF' ? '#CCCCCC' : eq.color }} />
              <span style={{ fontWeight: 700, fontSize: 16, color: eq.color === '#FFFFFF' ? '#000000' : eq.color }}>{eq.nombre}</span>
            </div>

            {/* ENCABEZADO */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 80px', padding: '10px 20px', background: '#0f3460', fontSize: 11, color: '#8a8a9a', textTransform: 'uppercase', letterSpacing: 1, gap: 8 }}>
              <div>Jugador</div>
              <div style={{ textAlign: 'center' }}>P. de 1</div>
              <div style={{ textAlign: 'center' }}>P. de 2</div>
              <div style={{ textAlign: 'center' }}>P. de 3</div>
              <div style={{ textAlign: 'center' }}>Total</div>
            </div>

            {/* FILAS */}
            {eq.jugadores.map((j, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 80px', padding: '12px 20px', borderBottom: '1px solid #ffffff08', alignItems: 'center', gap: 8, background: i % 2 === 0 ? '#16213e' : '#1a2744' }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{j.nombre}</div>
                <div style={{ textAlign: 'center', fontSize: 13 }}>{j.p1}</div>
                <div style={{ textAlign: 'center', fontSize: 13 }}>{j.p2}</div>
                <div style={{ textAlign: 'center', fontSize: 13 }}>{j.p3}</div>
                <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#F5B800' }}>{j.total}</div>
              </div>
            ))}

            {/* TOTAL EQUIPO */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 80px', padding: '14px 20px', background: '#0f3460', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#F5B800' }}>TOTAL EQUIPO</div>
              {['p1','p2','p3','total'].map(key => (
                <div key={key} style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#F5B800' }}>
                  {eq.jugadores.reduce((sum, j) => sum + (parseInt(j[key as keyof JugadorEquipo]) || 0), 0)}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
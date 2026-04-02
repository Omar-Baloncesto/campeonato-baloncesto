'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Jugador {
  nombre: string;
  fechas: string[];
  asistencia: string;
  totalFechas: string;
  fraccion: string;
  porcentaje: string;
}

interface Equipo {
  nombre: string;
  color: string;
  jugadores: Jugador[];
}

const FECHAS = ['21/02','28/02','7/03','14/03','26/03','11/04','18/04','25/04','2/05','9/05'];

const EQUIPOS_CONFIG = [
  { nombre: 'Miami Heat', color: '#FFFFFF', inicio: 4, fin: 14 },
  { nombre: 'Brooklyn Nets', color: '#AAAAAA', inicio: 22, fin: 31 },
  { nombre: 'Boston Celtics', color: '#00FF00', inicio: 40, fin: 50 },
  { nombre: 'Oklahoma City Thunder', color: '#00BFFF', inicio: 58, fin: 68 },
  { nombre: 'Los Angeles Lakers', color: '#FFD700', inicio: 76, fin: 86 },
  { nombre: 'Toronto Raptors', color: '#FF0000', inicio: 93, fin: 103 },
];

export default function Asistencias() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [equipoActivo, setEquipoActivo] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sheets?sheet=AsistenciasJugadores')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data.length > 1) {
          const rows = data.data;
          const result = EQUIPOS_CONFIG.map(eq => ({
            nombre: eq.nombre,
            color: eq.color,
            jugadores: rows
              .slice(eq.inicio - 1, eq.fin)
              .filter((r: string[]) => r[0] && r[0] !== 'Jugador')
              .map((r: string[]) => ({
                nombre: r[0],
                fechas: [r[1],r[2],r[3],r[4],r[5],r[6],r[7],r[8],r[9],r[10]],
                asistencia: r[11] || '0',
                totalFechas: r[12] || '0',
                fraccion: r[13] || '0/0',
                porcentaje: r[14] || '0%',
              }))
          }));
          setEquipos(result);
        }
        setLoading(false);
      });
  }, []);

  const eq = equipos[equipoActivo];
  const color = eq?.color || '#888';
  const esBlanco = color === '#FFFFFF';

  const pctColor = (pct: string) => {
    const n = parseFloat(pct);
    if (n >= 80) return '#4ade80';
    if (n >= 50) return '#F5B800';
    return '#f87171';
  };

  return (
    <main style={{ background: '#1a1a2e', minHeight: '100vh', fontFamily: 'sans-serif', color: '#f0ece3' }}>

      <div style={{ background: '#16213e', borderBottom: '2px solid #F5B800', padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <Link href="/" style={{ color: '#8a8a9a', textDecoration: 'none', fontSize: 13 }}>← Inicio</Link>
        <span style={{ color: '#333' }}>|</span>
        <span style={{ fontSize: 22, fontWeight: 700, color: '#F5B800', letterSpacing: 2 }}>📋 ASISTENCIAS</span>
      </div>

      <div style={{ padding: '16px 24px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {equipos.map((e, i) => (
          <button key={i} onClick={() => setEquipoActivo(i)}
            style={{ padding: '6px 14px', borderRadius: 20,
              border: equipoActivo === i ? `2px solid ${e.color === '#FFFFFF' ? '#CCCCCC' : e.color}` : '2px solid transparent',
              cursor: 'pointer', fontSize: 12, fontWeight: 500,
              background: equipoActivo === i ? (e.color === '#FFFFFF' ? '#FFFFFF' : e.color + '20') : '#16213e',
              color: equipoActivo === i ? (e.color === '#FFFFFF' ? '#000000' : e.color) : '#8a8a9a' }}>
            {e.nombre}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 24px 32px', overflowX: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#8a8a9a', padding: 60 }}>Cargando asistencias...</div>
        ) : eq ? (
          <div style={{ background: '#16213e', borderRadius: 12, overflow: 'hidden', minWidth: 900 }}>

            <div style={{ padding: '16px 20px', background: esBlanco ? '#FFFFFF' : color + '20', borderBottom: `2px solid ${esBlanco ? '#CCCCCC' : color}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: esBlanco ? '#CCCCCC' : color }} />
              <span style={{ fontWeight: 700, fontSize: 16, color: esBlanco ? '#000000' : color }}>{eq.nombre}</span>
            </div>

            {/* ENCABEZADO */}
            <div style={{ display: 'grid', gridTemplateColumns: '160px repeat(10, 50px) 55px 55px 65px 55px', padding: '10px 16px', background: '#0f3460', fontSize: 10, color: '#8a8a9a', textTransform: 'uppercase', letterSpacing: 1, gap: 4 }}>
              <div>Jugador</div>
              {FECHAS.map(f => <div key={f} style={{ textAlign: 'center' }}>{f}</div>)}
              <div style={{ textAlign: 'center' }}>Asist.</div>
              <div style={{ textAlign: 'center' }}>Fechas</div>
              <div style={{ textAlign: 'center' }}>Fracc.</div>
              <div style={{ textAlign: 'center' }}>%</div>
            </div>

            {/* FILAS */}
            {eq.jugadores.map((j, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '160px repeat(10, 50px) 55px 55px 65px 55px', padding: '10px 16px', borderBottom: '1px solid #ffffff08', alignItems: 'center', gap: 4, background: i % 2 === 0 ? '#16213e' : '#1a2744' }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{j.nombre}</div>
                {j.fechas.map((f, fi) => (
                  <div key={fi} style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: 14, color: f === '1' ? '#4ade80' : f === '0' && fi < 5 ? '#f87171' : '#8a8a9a' }}>
                      {f === '1' ? '✓' : f === '0' && fi < 5 ? '✗' : ''}
                    </span>
                  </div>
                ))}
                <div style={{ textAlign: 'center', fontSize: 12 }}>{j.asistencia}</div>
                <div style={{ textAlign: 'center', fontSize: 12 }}>{j.totalFechas}</div>
                <div style={{ textAlign: 'center', fontSize: 12 }}>{j.fraccion}</div>
                <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: pctColor(j.porcentaje) }}>{j.porcentaje}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
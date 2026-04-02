'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Partido {
  equipoA: string; q1A: string; q2A: string; q3A: string; q4A: string; taA: string; totalA: string;
  equipoB: string; q1B: string; q2B: string; q3B: string; q4B: string; taB: string; totalB: string;
}

interface Fecha {
  fecha: string;
  partidos: Partido[];
}

const COLORES: Record<string, string> = {
  'Miami Heat': '#FFFFFF',
  'Brooklyn Nets': '#AAAAAA',
  'Boston Celtics': '#00FF00',
  'Oklahoma City Thunder': '#00BFFF',
  'Los Angeles Lakers': '#FFD700',
  'Toronto Raptors': '#FF0000',
};

const esEquipo = (nombre: string) => Object.keys(COLORES).includes(nombre?.trim());

export default function ListaEquipos() {
  const [fechas, setFechas] = useState<Fecha[]>([]);
  const [fechaActiva, setFechaActiva] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sheets?sheet=ListaEquipos')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const rows = data.data;
          const result: Fecha[] = [];
          let fechaActual: Fecha | null = null;
          let equipoA: string[] | null = null;

          for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            const f = (r[5] || '').toString().trim();

            if (f.match(/\d{2}\/\d{2}\/\d{4}/)) {
              if (fechaActual) result.push(fechaActual);
              fechaActual = { fecha: f, partidos: [] };
              equipoA = null;
            } else if (esEquipo(f) && fechaActual) {
              if (!equipoA) {
                equipoA = [f, r[6]||'', r[7]||'', r[8]||'', r[9]||'', r[10]||'', r[11]||''];
              } else {
                fechaActual.partidos.push({
                  equipoA: equipoA[0], q1A: equipoA[1], q2A: equipoA[2], q3A: equipoA[3], q4A: equipoA[4], taA: equipoA[5], totalA: equipoA[6],
                  equipoB: f, q1B: r[6]||'', q2B: r[7]||'', q3B: r[8]||'', q4B: r[9]||'', taB: r[10]||'', totalB: r[11]||'',
                });
                equipoA = null;
              }
            }
          }
          if (fechaActual) result.push(fechaActual);
          setFechas(result.filter(f => f.partidos.length > 0));
        }
        setLoading(false);
      });
  }, []);

  const colorEq = (n: string) => COLORES[n] || '#888';
  const esBlanco = (n: string) => n === 'Miami Heat';
  const fecha = fechas[fechaActiva];

  return (
    <main style={{ background: '#1a1a2e', minHeight: '100vh', fontFamily: 'sans-serif', color: '#f0ece3' }}>
      <div style={{ background: '#16213e', borderBottom: '2px solid #F5B800', padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <Link href="/" style={{ color: '#8a8a9a', textDecoration: 'none', fontSize: 13 }}>← Inicio</Link>
        <span style={{ color: '#333' }}>|</span>
        <span style={{ fontSize: 22, fontWeight: 700, color: '#F5B800', letterSpacing: 2 }}>🏀 MARCADORES POR CUARTO</span>
      </div>

      <div style={{ padding: '16px 24px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {fechas.map((f, i) => (
          <button key={i} onClick={() => setFechaActiva(i)}
            style={{ padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
              background: fechaActiva === i ? '#F5B800' : '#16213e',
              color: fechaActiva === i ? '#1a1a2e' : '#8a8a9a' }}>
            {f.fecha}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 24px 32px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#8a8a9a', padding: 60 }}>Cargando...</div>
        ) : fecha ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {fecha.partidos.map((p, i) => {
              const ganA = parseInt(p.totalA) > parseInt(p.totalB);
              const ganB = parseInt(p.totalB) > parseInt(p.totalA);
              return (
                <div key={i} style={{ background: '#16213e', borderRadius: 12, overflow: 'hidden', border: '1px solid #ffffff08' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '180px repeat(6, 1fr)', padding: '8px 16px', background: '#0f3460', fontSize: 11, color: '#8a8a9a', textTransform: 'uppercase', gap: 8 }}>
                    <div>Equipo</div>
                    <div style={{ textAlign: 'center' }}>1°</div>
                    <div style={{ textAlign: 'center' }}>2°</div>
                    <div style={{ textAlign: 'center' }}>3°</div>
                    <div style={{ textAlign: 'center' }}>4°</div>
                    <div style={{ textAlign: 'center' }}>TA</div>
                    <div style={{ textAlign: 'center' }}>Total</div>
                  </div>
                  {[[p.equipoA, p.q1A, p.q2A, p.q3A, p.q4A, p.taA, p.totalA, ganA],
                    [p.equipoB, p.q1B, p.q2B, p.q3B, p.q4B, p.taB, p.totalB, ganB]].map((eq, ei) => (
                    <div key={ei} style={{ display: 'grid', gridTemplateColumns: '180px repeat(6, 1fr)', padding: '12px 16px', alignItems: 'center', gap: 8, borderTop: ei === 1 ? '1px solid #ffffff08' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: esBlanco(eq[0] as string) ? '#CCCCCC' : colorEq(eq[0] as string), flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{eq[0] as string}</span>
                      </div>
                      {[eq[1], eq[2], eq[3], eq[4], eq[5]].map((q, qi) => (
                        <div key={qi} style={{ textAlign: 'center', fontSize: 13 }}>{q as string || '-'}</div>
                      ))}
                      <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, color: eq[7] ? '#F5B800' : '#f0ece3' }}>{eq[6] as string || '0'}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </main>
  );
}
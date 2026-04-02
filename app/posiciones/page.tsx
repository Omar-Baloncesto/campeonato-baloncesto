'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Equipo {
  nombre: string;
  pj: string;
  pg: string;
  pp: string;
  puntosAnotados: string;
  puntosRecibidos: string;
  diferencia: string;
  puntos: string;
  puesto: string;
}

const COLORES: Record<string, string> = {
  'Miami Heat': '#FFFFFF',
  'Brooklyn Nets': '#AAAAAA',
  'Boston Celtics': '#00FF00',
  'Oklahoma City Thunder': '#00BFFF',
  'Los Angeles Lakers': '#FFD700',
  'Toronto Raptors': '#FF0000',
};

export default function Posiciones() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sheets?sheet=TablaPosiciones')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data.length > 1) {
          const rows = data.data.slice(1).filter((r: string[]) => r[0]);
          setEquipos(rows.map((r: string[]) => ({
            nombre: r[0], pj: r[1], pg: r[2], pp: r[3],
            puntosAnotados: r[4], puntosRecibidos: r[5],
            diferencia: r[6], puntos: r[7], puesto: r[8],
          })));
        }
        setLoading(false);
      });
  }, []);

  const colorEquipo = (nombre: string) => COLORES[nombre] || '#888';
  const medallon = (puesto: string) => {
  if (puesto === 'PRIMERO') return '1°';
  if (puesto === 'SEGUNDO') return '2°';
  if (puesto === 'TERCERO') return '3°';
  if (puesto === 'CUARTO') return '4°';
  if (puesto === 'QUINTO') return '5°';
  if (puesto === 'SEXTO') return '6°';
  return puesto;
};

  return (
    <main style={{ background: '#1a1a2e', minHeight: '100vh', fontFamily: 'sans-serif', color: '#f0ece3' }}>

      {/* HEADER */}
      <div style={{ background: '#16213e', borderBottom: '2px solid #F5B800', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/" style={{ color: '#8a8a9a', textDecoration: 'none', fontSize: 13 }}>← Inicio</Link>
          <span style={{ color: '#333' }}>|</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#F5B800', letterSpacing: 2 }}>🏆 POSICIONES</span>
        </div>
        <div style={{ fontSize: 12, color: '#8a8a9a' }}>Temporada 2026</div>
      </div>

      {/* TABLA */}
      <div style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#8a8a9a', padding: 60 }}>Cargando posiciones...</div>
        ) : (
          <div style={{ background: '#16213e', borderRadius: 12, overflow: 'hidden' }}>

            {/* ENCABEZADO */}
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 50px 50px 50px 80px 80px 70px 60px', padding: '12px 20px', background: '#0f3460', fontSize: 11, color: '#8a8a9a', textTransform: 'uppercase', letterSpacing: 1, gap: 8 }}>
              <div>#</div>
              <div>Equipo</div>
              <div style={{ textAlign: 'center' }}>PJ</div>
              <div style={{ textAlign: 'center' }}>PG</div>
              <div style={{ textAlign: 'center' }}>PP</div>
              <div style={{ textAlign: 'center' }}>P. Ano.</div>
              <div style={{ textAlign: 'center' }}>P. Rec.</div>
              <div style={{ textAlign: 'center' }}>Dif.</div>
              <div style={{ textAlign: 'center' }}>Pts</div>
            </div>

            {/* FILAS */}
            {equipos.map((eq, i) => {
              const color = colorEquipo(eq.nombre);
              const esMiami = eq.nombre === 'Miami Heat';
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 50px 50px 50px 80px 80px 70px 60px', padding: '14px 20px', borderBottom: '1px solid #ffffff08', alignItems: 'center', gap: 8, background: i % 2 === 0 ? '#16213e' : '#1a2744' }}>
                  <div style={{ fontSize: 18 }}>{medallon(eq.puesto)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: esMiami ? '#FFFFFF' : color, border: esMiami ? '1px solid #ccc' : 'none', flexShrink: 0 }} />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{eq.nombre}</span>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 13 }}>{eq.pj}</div>
                  <div style={{ textAlign: 'center', fontSize: 13, color: '#4ade80' }}>{eq.pg}</div>
                  <div style={{ textAlign: 'center', fontSize: 13, color: '#f87171' }}>{eq.pp}</div>
                  <div style={{ textAlign: 'center', fontSize: 13 }}>{eq.puntosAnotados}</div>
                  <div style={{ textAlign: 'center', fontSize: 13 }}>{eq.puntosRecibidos}</div>
                  <div style={{ textAlign: 'center', fontSize: 13, color: Number(eq.diferencia) >= 0 ? '#4ade80' : '#f87171' }}>{eq.diferencia}</div>
                  <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#F5B800' }}>{eq.puntos}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
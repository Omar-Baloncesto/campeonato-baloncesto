import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Posiciones',
  description:
    'Tabla de posiciones del Campeonato de Baloncesto Cúcuta 2026: partidos jugados, ganados, perdidos, puntos a favor, en contra, diferencia y promedio por equipo.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

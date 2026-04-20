import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ranking de jugadores',
  description:
    'Detalle por fecha de los puntos de 1, 2 y 3 anotados por cada jugador del Campeonato de Baloncesto Cúcuta 2026, agrupado por equipo.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

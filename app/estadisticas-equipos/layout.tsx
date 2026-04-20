import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stats por equipo',
  description:
    'Estadísticas por equipo del Campeonato de Baloncesto Cúcuta 2026: puntos de 1, 2 y 3, totales y máximos anotadores por roster.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Estadísticas',
  description:
    'Ranking de jugadores del Campeonato de Baloncesto Cúcuta 2026 por puntos, asistencias y promedio, además de los máximos anotadores.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

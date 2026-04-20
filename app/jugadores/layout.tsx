import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Jugadores',
  description:
    'Listado de jugadores del Campeonato de Baloncesto Cúcuta 2026 con su equipo, número, posición y estadísticas detalladas.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

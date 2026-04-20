import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fixture',
  description:
    'Calendario de partidos del Campeonato de Baloncesto Cúcuta 2026: fechas, horarios, marcadores y filtro por jornada.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

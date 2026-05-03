import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Equipos Empatados',
  description:
    'Equipos empatados en posiciones del Campeonato de Baloncesto Cúcuta 2026, actualizado dinámicamente desde la planilla del torneo.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

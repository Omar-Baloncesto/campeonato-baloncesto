import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Asistencias',
  description:
    'Registro de asistencia por jugador y por fecha del Campeonato de Baloncesto Cúcuta 2026, con porcentaje de partidos asistidos.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

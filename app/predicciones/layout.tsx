import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Predicciones',
  description:
    'Haz tus predicciones para los partidos del Campeonato de Baloncesto Cúcuta 2026 y sigue tu porcentaje de aciertos.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

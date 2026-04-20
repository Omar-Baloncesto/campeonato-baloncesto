import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Marcadores',
  description:
    'Marcadores por cuarto de cada partido del Campeonato de Baloncesto Cúcuta 2026: 1°, 2°, 3°, 4° cuarto, tiempo añadido y total por equipo.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

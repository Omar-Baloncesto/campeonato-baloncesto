import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bracket',
  description:
    'Fase eliminatoria del Campeonato de Baloncesto Cúcuta 2026: play-in, semifinales, final y campeón con marcadores por cuarto.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

'use client';
import { useEffect, useState } from 'react';
import { registerTeamColors } from '../lib/constants';

/**
 * Carga una vez los colores de la hoja EQUIPOS (columna F) y los registra en
 * constants, para que getTeamColor / isWhiteTeam los resuelvan por nombre en
 * todas las páginas (Fixture, Posiciones, Bracket, ...). Al terminar la carga
 * fuerza un re-render para que las barras de color se repinten.
 */
export default function TeamColorsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [, bump] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/sheets?sheet=EQUIPOS')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.success && Array.isArray(data.data) && data.data.length > 1) {
          const rows = data.data
            .slice(1)
            .filter((r: string[]) => r[1]);
          registerTeamColors(
            rows.map((r: string[]) => ({ id: r[0], name: r[1], color: r[5] }))
          );
          bump((v) => v + 1);
        }
      })
      .catch(() => {
        /* si falla, se conservan los colores por defecto */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return <>{children}</>;
}

'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { registerTeamColors } from '../lib/constants';

/**
 * Versión que se incrementa cuando terminan de cargarse los colores de la
 * hoja EQUIPOS. Los componentes que pintan colores (barras del Fixture, etc.)
 * leen esta versión con `useTeamColorsVersion()` para volver a renderizarse
 * en cuanto los colores están disponibles.
 */
const TeamColorsContext = createContext(0);

export function useTeamColorsVersion(): number {
  return useContext(TeamColorsContext);
}

/**
 * Carga una vez los colores de la hoja EQUIPOS (columna F) y los registra en
 * constants, para que getTeamColor / isWhiteTeam los resuelvan por nombre en
 * todas las páginas (Fixture, Posiciones, Bracket, ...).
 */
export default function TeamColorsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/sheets?sheet=EQUIPOS')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.success && Array.isArray(data.data) && data.data.length > 1) {
          const rows = data.data.slice(1).filter((r: string[]) => r[1]);
          registerTeamColors(
            rows.map((r: string[]) => ({ id: r[0], name: r[1], color: r[5] }))
          );
          setVersion((v) => v + 1);
        }
      })
      .catch(() => {
        /* si falla, se conservan los colores por defecto */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <TeamColorsContext.Provider value={version}>
      {children}
    </TeamColorsContext.Provider>
  );
}

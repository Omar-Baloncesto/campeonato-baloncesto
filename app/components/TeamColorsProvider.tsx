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

/** Código de color hex válido: #RGB o #RRGGBB. */
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Devuelve el color del equipo a partir de su fila en EQUIPOS: toma el PRIMER
 * código hex de la fila (columna del nombre en adelante). Así funciona sin
 * importar en qué columna esté el hex, y evita quedarse con el nombre del color
 * en español (p. ej. "Blanco"), que no es un color válido para la web.
 */
function colorFromRow(row: string[]): string | undefined {
  for (let i = 2; i < row.length; i++) {
    const cell = String(row[i] ?? '').trim();
    if (HEX.test(cell)) return cell;
  }
  return undefined;
}

/**
 * Carga una vez los colores de la hoja EQUIPOS y los registra en constants,
 * para que getTeamColor / isWhiteTeam los resuelvan por nombre en todas las
 * páginas (Fixture, Posiciones, Bracket, ...).
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
            rows.map((r: string[]) => ({
              id: r[0],
              name: r[1],
              color: colorFromRow(r),
            }))
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

'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { registerTeams, firstHexInRow, type SheetTeam } from '../lib/constants';

interface TeamsState {
  /** Se incrementa cuando terminan de cargarse los equipos de EQUIPOS. */
  version: number;
  /** Equipos del campeonato actual (id, nombre, color) desde la hoja. */
  teams: SheetTeam[];
}

const TeamsContext = createContext<TeamsState>({ version: 0, teams: [] });

/** Versión reactiva: úsala para repintar cuando cargan nombres/colores. */
export function useTeamColorsVersion(): number {
  return useContext(TeamsContext).version;
}

/** Equipos del campeonato actual (id, nombre, color) desde la hoja EQUIPOS. */
export function useTeams(): SheetTeam[] {
  return useContext(TeamsContext).teams;
}

/**
 * Carga una vez los equipos de la hoja EQUIPOS (nombre + color) y los registra
 * en constants, para que getTeamColor / getTeamName / getSheetTeams los
 * resuelvan en todas las páginas. Al crear un campeonato nuevo, cambian solos.
 */
export default function TeamColorsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<TeamsState>({ version: 0, teams: [] });

  useEffect(() => {
    let cancelled = false;

    fetch('/api/sheets?sheet=EQUIPOS')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.success && Array.isArray(data.data) && data.data.length > 1) {
          const teams: SheetTeam[] = data.data
            .slice(1)
            .filter((r: string[]) => r[1])
            .map((r: string[]) => ({
              id: String(r[0] ?? '').trim(),
              name: String(r[1] ?? '').trim(),
              color: firstHexInRow(r) || '#888888',
            }));
          registerTeams(teams);
          setState((s) => ({ version: s.version + 1, teams }));
        }
      })
      .catch(() => {
        /* si falla, se conservan los valores por defecto */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <TeamsContext.Provider value={state}>{children}</TeamsContext.Provider>
  );
}

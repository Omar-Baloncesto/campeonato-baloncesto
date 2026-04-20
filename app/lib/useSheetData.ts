'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Generic hook for fetching a Google Sheets sheet through `/api/sheets`.
 *
 * Handles the boilerplate that every page repeats:
 *   - AbortController on unmount / refetch
 *   - Array.isArray validation of `data.data` from the API
 *   - loading / error / lastUpdated state
 *
 * The `parser` is invoked with the raw rows (the sheet's full 2D matrix as
 * returned by gviz, including any header row). It runs only when the API
 * response is successful and the rows are an array.
 *
 * Pages that have multi-sheet fetches or other special concerns can keep
 * their bespoke `fetchData`. Migration to this hook can happen incrementally;
 * see app/posiciones, app/fixture, app/predicciones for examples.
 */
export interface UseSheetDataResult<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
  lastUpdated: Date | null;
  refetch: () => void;
}

export function useSheetData<T>(
  sheet: string,
  parser: (rows: string[][]) => T
): UseSheetDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Keep the latest parser in a ref so callers don't have to memoise it
  // for the hook's identity to stay stable. Updating the ref happens in an
  // effect so we don't violate react-hooks/refs-during-render.
  const parserRef = useRef(parser);
  useEffect(() => {
    parserRef.current = parser;
  }, [parser]);

  const refetch = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    setLoading(true);
    setError(false);

    fetch(`/api/sheets?sheet=${encodeURIComponent(sheet)}`, { signal })
      .then((r) => r.json())
      .then((json) => {
        if (signal.aborted) return;
        if (json?.success && Array.isArray(json.data)) {
          try {
            setData(parserRef.current(json.data));
            setLastUpdated(new Date());
          } catch (e) {
            console.error(`useSheetData(${sheet}) parser error:`, e);
            setError(true);
          }
        } else {
          setError(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (err?.name === 'AbortError' || signal.aborted) return;
        setError(true);
        setLoading(false);
      });
  }, [sheet]);

  useEffect(() => {
    refetch();
    return () => {
      abortRef.current?.abort();
    };
  }, [refetch]);

  return { data, loading, error, lastUpdated, refetch };
}

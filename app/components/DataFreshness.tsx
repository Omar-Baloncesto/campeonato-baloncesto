'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from './ToastProvider';

interface DataFreshnessProps {
  lastUpdated: Date | null;
  onRefresh: () => void;
  loading: boolean;
}

const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return rtf.format(-seconds, 'second');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');
  const days = Math.floor(hours / 24);
  return rtf.format(-days, 'day');
}

export default function DataFreshness({ lastUpdated, onRefresh, loading }: DataFreshnessProps) {
  const [, setTick] = useState(0);
  const manualRefresh = useRef(false);
  const { showToast } = useToast();

  // Re-render every 30s to update the "ago" text — but only while the
  // tab is visible. Hidden tabs (background, minimised, locked screen)
  // don't need to recompute the label.
  useEffect(() => {
    if (!lastUpdated) return;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (intervalId == null) {
        intervalId = setInterval(() => setTick((t) => t + 1), 30000);
      }
    };
    const stop = () => {
      if (intervalId != null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Force one immediate re-render so the text catches up after
        // the tab was hidden, then resume the interval.
        setTick((t) => t + 1);
        start();
      } else {
        stop();
      }
    };
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [lastUpdated]);

  // Show toast after manual refresh completes
  useEffect(() => {
    if (!loading && manualRefresh.current) {
      showToast('Datos actualizados');
      manualRefresh.current = false;
    }
  }, [loading, showToast]);

  const handleRefresh = () => {
    manualRefresh.current = true;
    onRefresh();
  };

  return (
    <div className="flex items-center gap-2 text-[11px] text-text-muted/70">
      {lastUpdated && (
        <span>Actualizado {timeAgo(lastUpdated)}</span>
      )}
      <button
        onClick={handleRefresh}
        disabled={loading}
        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/[0.06] transition-colors disabled:opacity-50"
        aria-label="Actualizar datos"
      >
        <svg
          className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );
}

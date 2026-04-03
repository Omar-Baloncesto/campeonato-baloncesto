'use client';

import { useState, useEffect } from 'react';

interface DataFreshnessProps {
  lastUpdated: Date | null;
  onRefresh: () => void;
  loading: boolean;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'hace un momento';
  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return 'hace 1 min';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return 'hace 1 hora';
  return `hace ${hours} horas`;
}

export default function DataFreshness({ lastUpdated, onRefresh, loading }: DataFreshnessProps) {
  const [, setTick] = useState(0);

  // Re-render every 30s to update the "ago" text
  useEffect(() => {
    if (!lastUpdated) return;
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  return (
    <div className="flex items-center gap-2 text-[11px] text-text-muted/70">
      {lastUpdated && (
        <span>Actualizado {timeAgo(lastUpdated)}</span>
      )}
      <button
        onClick={onRefresh}
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

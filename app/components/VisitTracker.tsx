'use client';

import { useEffect } from 'react';

function todayKey(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset();
  return new Date(d.getTime() - tz * 60_000).toISOString().slice(0, 10);
}

export default function VisitTracker() {
  useEffect(() => {
    try {
      const key = `bv_visit_${todayKey()}`;
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
      fetch('/api/visits', { method: 'POST', keepalive: true }).catch(() => {});
    } catch {
      // ignore storage errors
    }
  }, []);

  return null;
}

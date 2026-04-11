'use client';

import { useState, useEffect } from 'react';
import { useToast } from './ToastProvider';

export default function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        showToast('Conexión restaurada', 'success');
      }
      setWasOffline(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline, showToast]);

  if (isOnline) return null;

  return (
    <div
      className="slide-down flex items-center justify-center gap-2 py-2 bg-negative/95 text-white text-sm font-medium backdrop-blur-sm"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10002 }}
      role="alert"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M12 12h.01M8.464 8.464a5 5 0 010 7.072M15.536 8.464a5 5 0 000 7.072" />
      </svg>
      Sin conexión a internet
    </div>
  );
}

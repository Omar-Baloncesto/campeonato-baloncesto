'use client';

import { APP_CONFIG } from '../lib/constants';

export default function Header() {
  return (
    <header className="bg-bg-secondary border-b-2 border-gold px-4 py-3 md:px-7 md:py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-3xl md:text-4xl" role="img" aria-label="baloncesto">🏀</span>
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-gold tracking-wider">
            {APP_CONFIG.title}
          </h1>
          <p className="text-[11px] md:text-xs text-text-muted tracking-wide">
            {APP_CONFIG.subtitle}
          </p>
        </div>
      </div>
      <div
        className="bg-live text-white text-[11px] font-semibold px-3 py-1 rounded-full tracking-wide"
        role="status"
        aria-label="Transmisión en vivo"
      >
        EN VIVO
      </div>
    </header>
  );
}

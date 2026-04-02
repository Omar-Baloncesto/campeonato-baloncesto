'use client';

import Link from 'next/link';
import { APP_CONFIG } from '../lib/constants';

export default function Header() {
  return (
    <header className="relative overflow-hidden border-b-2 border-gold">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-bg-secondary via-bg-secondary to-[#1a2848]" />
      <div className="absolute inset-0 bg-gradient-to-b from-gold/[0.03] to-transparent" />

      <div className="relative px-4 py-3 md:px-7 md:py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 no-underline group">
          {/* Basketball SVG icon */}
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/30 transition-shadow">
            <svg viewBox="0 0 24 24" className="w-6 h-6 md:w-7 md:h-7 text-white/90" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2c0 10 0 10 0 20" />
              <path d="M2 12h20" />
              <path d="M4.5 4.5c3 3 5 5 5 7.5s-2 4.5-5 7.5" />
              <path d="M19.5 4.5c-3 3-5 5-5 7.5s2 4.5 5 7.5" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg md:text-2xl font-bold gradient-text tracking-wider">
              {APP_CONFIG.title}
            </h1>
            <p className="text-[11px] md:text-xs text-text-muted tracking-wide">
              {APP_CONFIG.subtitle}
            </p>
          </div>
        </Link>

        {/* Live badge with pulse */}
        <div className="flex items-center gap-2">
          <div
            className="live-pulse bg-live text-white text-[10px] md:text-[11px] font-bold px-3 py-1 rounded-full tracking-wider flex items-center gap-1.5"
            role="status"
            aria-label="Transmision en vivo"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            EN VIVO
          </div>
        </div>
      </div>
    </header>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { APP_CONFIG } from '../lib/constants';
export default function Header() {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setCompact(window.scrollY > 60);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="relative overflow-hidden border-b-2 border-gold sticky top-0 z-40">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-bg-secondary via-bg-secondary to-[#1a2848]" />
      <div className="absolute inset-0 bg-gradient-to-b from-gold/[0.03] to-transparent" />

      <div className={`relative px-4 md:px-7 flex items-center justify-between transition-all duration-300 ${compact ? 'py-1.5' : 'py-3 md:py-4'}`}>
        <Link href="/" className="flex items-center gap-3 no-underline group">
          {/* Basketball SVG icon */}
          <div className={`rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/30 transition-all duration-300 ${compact ? 'w-8 h-8' : 'w-10 h-10 md:w-12 md:h-12'}`}>
            <svg viewBox="0 0 24 24" className={`text-white/90 transition-all duration-300 ${compact ? 'w-5 h-5' : 'w-6 h-6 md:w-7 md:h-7'}`} fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2c0 10 0 10 0 20" />
              <path d="M2 12h20" />
              <path d="M4.5 4.5c3 3 5 5 5 7.5s-2 4.5-5 7.5" />
              <path d="M19.5 4.5c-3 3-5 5-5 7.5s2 4.5 5 7.5" />
            </svg>
          </div>
          <div>
            <h1 className={`font-bold gradient-text tracking-wider transition-all duration-300 ${compact ? 'text-sm md:text-lg' : 'text-lg md:text-2xl'}`}>
              {APP_CONFIG.title}
            </h1>
            <p className={`text-[11px] md:text-xs text-text-muted tracking-wide transition-all duration-300 ${compact ? 'hidden' : ''}`}>
              {APP_CONFIG.subtitle}
            </p>
          </div>
        </Link>

      </div>
    </header>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS, APP_CONFIG } from '../lib/constants';

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close on navigation
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const toggle = useCallback(() => setIsOpen(prev => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <div className="md:hidden" style={{ position: 'fixed', top: 12, right: 12, zIndex: 9999 }}>
      {/* Floating hamburger button - fixed top right, only on mobile */}
      <button
        onClick={toggle}
        className="w-10 h-10 flex items-center justify-center rounded-lg bg-bg-secondary/80 backdrop-blur-sm border border-border-light hover:bg-white/[0.06] transition-colors"
        aria-expanded={isOpen}
        aria-label="Abrir menú de navegación"
      >
        <div className="w-5 h-4 flex flex-col justify-between">
          <span className={`block h-0.5 bg-text-primary rounded-full transition-all duration-300 origin-center ${isOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
          <span className={`block h-0.5 bg-text-primary rounded-full transition-all duration-300 ${isOpen ? 'opacity-0 scale-x-0' : ''}`} />
          <span className={`block h-0.5 bg-text-primary rounded-full transition-all duration-300 origin-center ${isOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
        </div>
      </button>

      {/* Overlay + Panel */}
      {isOpen && (
        <div className="fixed inset-0" style={{ zIndex: 9998 }}>
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm menu-overlay"
            onClick={close}
            aria-hidden="true"
          />

          {/* Slide panel */}
          <nav
            className="absolute top-0 right-0 bottom-0 w-[280px] bg-bg-secondary/95 backdrop-blur-xl border-l border-border-light menu-panel flex flex-col"
            role="dialog"
            aria-label="Menú de navegación"
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
              <span className="text-sm font-semibold gradient-text tracking-wider">MENÚ</span>
              <button
                onClick={close}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors"
                aria-label="Cerrar menú"
              >
                <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Nav items */}
            <div className="flex-1 overflow-y-auto py-2 menu-stagger">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center gap-3 px-5 py-3.5 text-sm transition-all duration-200
                      ${isActive
                        ? 'text-gold font-semibold border-l-2 border-gold bg-gold/[0.06]'
                        : 'text-text-muted hover:text-text-primary hover:bg-white/[0.04] border-l-2 border-transparent'
                      }
                    `}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="text-base w-6 text-center">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Panel footer */}
            <div className="px-5 py-4 border-t border-border-light">
              <div className="text-[10px] text-text-muted/50 tracking-[0.2em] uppercase text-center">
                {APP_CONFIG.title}
              </div>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}

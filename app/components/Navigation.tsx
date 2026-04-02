'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '../lib/constants';

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegacion principal"
      className="bg-bg-secondary/80 backdrop-blur-sm border-b border-border-light overflow-x-auto"
    >
      <div className="flex gap-0.5 px-3 md:px-5 py-0.5 min-w-max">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                relative px-3 py-2.5 text-[13px] whitespace-nowrap rounded-t-lg
                flex items-center gap-1.5 transition-all duration-200
                ${isActive
                  ? 'text-gold font-semibold'
                  : 'text-text-muted hover:text-text-primary hover:bg-white/[0.03]'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="text-xs">{item.icon}</span>
              {item.label}
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-gold/0 via-gold to-gold/0 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

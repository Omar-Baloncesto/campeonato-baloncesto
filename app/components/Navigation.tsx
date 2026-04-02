'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from '../lib/constants';

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="bg-bg-secondary/50 border-b border-border-light overflow-x-auto"
    >
      <div className="flex gap-1 px-4 md:px-6 py-1 min-w-max">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                px-3 py-2.5 text-[13px] whitespace-nowrap rounded-t-lg
                transition-all duration-150
                ${isActive
                  ? 'text-gold border-b-2 border-gold font-semibold bg-gold/5'
                  : 'text-text-muted border-b-2 border-transparent hover:text-gold/80 hover:bg-white/[0.02]'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

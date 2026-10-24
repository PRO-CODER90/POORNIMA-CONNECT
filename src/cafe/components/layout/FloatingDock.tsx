'use client';

import Link from 'next/link';
import type { NavItem } from './roleNav';

/** Student nav: a floating pill at the bottom of the screen on every breakpoint. */
export default function FloatingDock({ items, isActive }: { items: NavItem[]; isActive: (item: NavItem) => boolean }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <nav
        aria-label="Student navigation"
        className="pointer-events-auto flex items-center gap-1 rounded-full border border-white bg-white/95 p-2 shadow-[0_10px_40px_-10px_rgba(18,39,95,0.35)] backdrop-blur"
      >
        {items.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-full text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pu-500 sm:text-sm ${
                active
                  ? 'bg-pu-600 px-4 py-3 text-white shadow-md sm:px-5'
                  : 'px-3 py-3 text-pu-900/80 hover:bg-pu-50 sm:px-4'
              }`}
            >
              <item.icon size={18} strokeWidth={active ? 2.4 : 2} aria-hidden />
              {active ? (
                <>
                  <span className="sm:hidden">{item.shortLabel ?? item.label}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </>
              ) : (
                <span className="hidden sm:inline">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

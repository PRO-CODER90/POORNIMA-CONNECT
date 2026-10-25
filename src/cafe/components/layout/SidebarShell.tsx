'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MoreHorizontal, X } from 'lucide-react';
import TopBar from './TopBar';
import type { NavItem } from './roleNav';

/**
 * Admin layout: floating light sidebar on lg+; on smaller screens a dock with the four main
 * destinations plus "More", which opens a bottom sheet with every link.
 */
export default function SidebarShell({
  title,
  subtitle,
  userName,
  userMeta,
  homeHref,
  nav,
  mobileNav,
  isActive,
  onLogout,
  loggingOut,
  children,
}: {
  title: string;
  subtitle?: string;
  userName: string;
  userMeta?: string;
  homeHref: string;
  nav: NavItem[];
  mobileNav: NavItem[];
  isActive: (item: NavItem) => boolean;
  onLogout: () => void;
  loggingOut: boolean;
  children: React.ReactNode;
}) {
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheet(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet]);

  const moreActive = nav.some((i) => isActive(i) && !mobileNav.some((m) => m.href === i.href));

  return (
    <div className="cafe-page relative min-h-screen text-ink">
      {/* desktop: floating sidebar, inset 16px */}
      <aside
        aria-label="Admin navigation"
        className="surface fixed bottom-4 left-4 top-4 z-30 hidden w-60 flex-col overflow-hidden lg:flex"
      >
        <div className="px-5 pb-2 pt-5">
          <div className="font-serif text-lg font-semibold tracking-[0.08em] text-pu-900">POORNIMA</div>
          <div className="text-[11px] tracking-[0.3em] text-muted">CAFECONNECT</div>
        </div>
        <nav className="mt-2 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
          {nav.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pu-500 ${
                  active ? 'bg-pu-600 text-white' : 'text-pu-900/80 hover:bg-pu-50'
                }`}
              >
                <item.icon size={18} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <TopBar
          title={title}
          subtitle={subtitle}
          userName={userName}
          userMeta={userMeta}
          homeHref={homeHref}
          onLogout={onLogout}
          loggingOut={loggingOut}
        />
        <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-36 pt-4 sm:px-8 lg:px-10 lg:pb-10">{children}</main>
      </div>

      {/* mobile / tablet dock */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 lg:hidden">
        <nav
          aria-label="Admin navigation"
          className="pointer-events-auto flex items-center gap-1 rounded-full border border-white bg-white/95 p-2 shadow-[0_10px_40px_-10px_rgba(18,39,95,0.35)] backdrop-blur"
        >
          {mobileNav.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pu-500 ${
                  active ? 'bg-pu-600 text-white shadow-md' : 'text-pu-900/80 hover:bg-pu-50'
                }`}
              >
                <item.icon size={18} aria-hidden />
                {active ? item.label : <span className="hidden sm:inline">{item.label}</span>}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setSheet(true)}
            aria-haspopup="dialog"
            aria-expanded={sheet}
            className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pu-500 ${
              moreActive ? 'bg-pu-600 text-white shadow-md' : 'text-pu-900/80 hover:bg-pu-50'
            }`}
          >
            <MoreHorizontal size={18} aria-hidden />
            More
          </button>
        </nav>
      </div>

      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center lg:hidden" role="dialog" aria-modal="true" aria-label="All admin pages">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setSheet(false)} aria-hidden />
          <div className="surface relative z-10 max-h-[80vh] w-full overflow-y-auto rounded-b-none p-4 pb-6 sm:max-w-md sm:rounded-b-[20px]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-ink">All pages</h2>
              <button
                type="button"
                onClick={() => setSheet(false)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pu-500"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {nav.map((item) => {
                const active = isActive(item);
                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    onClick={() => setSheet(false)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-semibold ${
                      active ? 'bg-pu-600 text-white' : 'bg-pu-50/70 text-pu-900'
                    }`}
                  >
                    <item.icon size={18} aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

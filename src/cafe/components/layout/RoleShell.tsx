'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useState } from 'react';
import NotificationBell from '@/cafe/components/NotificationBell';
import { ROLE_NAV, type Role, type NavItem } from './roleNav';

export default function RoleShell({
  role,
  roleLabel,
  subtitle,
  userName,
  userMeta,
  children,
}: {
  role: Role;
  roleLabel?: string; // optional override (e.g. staff: "<cafe name> — Staff Panel")
  subtitle?: string;
  userName: string;
  userMeta?: string;
  children: React.ReactNode;
}) {
  const def = ROLE_NAV[role];
  const { nav, mobileNav } = def;
  const label = roleLabel ?? def.roleLabel;
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const mobile = mobileNav ?? nav.slice(0, 4);

  const logout = async () => {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/');
    router.refresh();
  };

  const isActive = (item: NavItem) => {
    if (item.match) return item.match(pathname);
    return pathname === item.href || pathname.startsWith(item.href + '/');
  };

  const isStudent = role === 'student';

  return (
    <div className={`cafe-page min-h-screen ${isStudent ? 'bg-warm-100 text-navy' : 'bg-slate-50'}`}>
      {/* desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden ${isStudent ? 'w-64 bg-navy border-r border-navy-800' : `w-60 ${def.accent}`} flex-col lg:flex`}
      >
        {isStudent ? (
          <div className="flex items-center gap-3 border-b border-white/5 px-6 py-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber/30 bg-amber/15 text-amber">
              <span className="text-base font-bold">PU</span>
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-tight text-white">PU CafeConnect</div>
              <div className="truncate text-[11px] font-medium text-slate-400">Campus Dining Portal</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-5 py-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-lg">☕</div>
            <div>
              <div className={`text-sm font-extrabold leading-tight ${def.accentText}`}>PU CafeConnect</div>
              <div className="text-[11px] text-white/60">{label}</div>
            </div>
          </div>
        )}

        <nav className="mt-3 flex-1 space-y-1 overflow-y-auto px-3">
          {nav.map((item) => {
            const active = isActive(item);
            if (isStudent) {
              return (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className={`group flex items-center justify-between rounded-lg px-3.5 py-2.5 text-xs transition-all ${
                    active
                      ? 'bg-white/10 font-semibold text-white shadow-sm'
                      : 'font-normal text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon
                      size={16}
                      className={active ? 'text-amber' : 'text-slate-400 group-hover:text-slate-200'}
                      aria-hidden
                    />
                    <span>{item.label}</span>
                  </div>
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-amber" aria-hidden />}
                </Link>
              );
            }
            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  active ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon size={18} aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={`border-t ${isStudent ? 'border-white/10 bg-navy-950/40 p-4' : 'border-white/10 p-4'}`}>
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white ${
                isStudent ? 'border border-white/10 bg-white/10' : 'rounded-full bg-white/15 text-sm font-bold'
              }`}
            >
              {userName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-white">{userName}</div>
              {userMeta ? (
                <div className={`truncate text-[11px] ${isStudent ? 'font-mono text-slate-400' : 'text-white/50'}`}>
                  {userMeta}
                </div>
              ) : null}
            </div>
          </div>
          <button
            onClick={logout}
            disabled={loggingOut}
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg text-xs transition-colors disabled:opacity-50 ${
              isStudent
                ? 'border border-white/10 bg-white/5 px-3 py-2 font-medium text-slate-300 hover:bg-white/10 hover:text-white'
                : 'rounded-xl bg-white/10 px-3 py-2 font-bold text-white hover:bg-white/20'
            }`}
          >
            <LogOut size={isStudent ? 13 : 14} aria-hidden />
            {loggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>

      {/* topbar */}
      <div className={isStudent ? 'lg:pl-64' : 'lg:pl-60'}>
        <header
          className={`sticky top-0 z-20 flex items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur lg:px-8 ${
            isStudent ? 'border-slate-200 bg-warm-100/95' : 'border-slate-200 bg-white/90'
          }`}
        >
          <div className="flex items-center gap-2.5 lg:hidden">
            {isStudent ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber/30 bg-amber/15 text-xs font-bold text-amber">
                PU
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-base">☕</div>
            )}
            <span className="text-sm font-bold text-navy">PU CafeConnect</span>
          </div>

          <div className="hidden lg:block">
            <div className="text-sm font-semibold text-navy">{label}</div>
            {subtitle ? <div className="text-xs text-slate-500">{subtitle}</div> : null}
          </div>

          <div className="flex items-center gap-2.5">
            <NotificationBell />
            <div
              className={`hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 sm:flex ${
                isStudent ? 'shadow-[0_1px_2px_rgba(0,0,0,0.02)]' : 'rounded-xl'
              }`}
            >
              <span className="text-xs font-semibold text-slate-700">{userName}</span>
              {userMeta ? <span className="font-mono text-[11px] text-slate-400">· {userMeta}</span> : null}
            </div>
            <button
              onClick={logout}
              disabled={loggingOut}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-200/60 hover:text-rose-600 lg:hidden"
              aria-label="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className={`mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 ${isStudent ? 'pb-28 lg:pb-12' : 'pb-24 lg:pb-10'}`}>
          {children}
        </main>

        {/* mobile bottom nav */}
        <nav
          className={`fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 backdrop-blur lg:hidden ${
            isStudent ? 'border-slate-200 shadow-[0_-2px_8px_rgba(0,0,0,0.03)]' : 'border-slate-200'
          }`}
        >
          <div className="mx-auto flex max-w-lg items-stretch justify-around">
            {mobile.map((item) => {
              const active = isActive(item);
              if (isStudent) {
                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] transition-colors ${
                      active ? 'font-semibold text-navy' : 'font-normal text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <item.icon size={18} className={active ? 'text-amber' : 'text-slate-400'} aria-hidden />
                    <span>{item.label}</span>
                    {active && <span className="absolute bottom-1 h-0.5 w-4 rounded-full bg-amber" aria-hidden />}
                  </Link>
                );
              }
              return (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold ${
                    active ? 'text-brand-600' : 'text-slate-400'
                  }`}
                >
                  <item.icon size={20} aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

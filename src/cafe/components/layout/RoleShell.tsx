'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useState } from 'react';
import NotificationBell from '@/cafe/components/NotificationBell';
import { ROLE_NAV, type Role, type NavItem } from './roleNav';
import StudentShell from './StudentShell';

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

  if (role === 'student') {
    return (
      <StudentShell
        title={label}
        subtitle={subtitle}
        userName={userName}
        userMeta={userMeta}
        nav={nav}
        isActive={isActive}
        onLogout={logout}
        loggingOut={loggingOut}
      >
        {children}
      </StudentShell>
    );
  }

  // Staff / admin shell (unchanged). Students get StudentShell above.
  return (
    <div className="cafe-page min-h-screen bg-slate-50">
      {/* desktop sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 hidden w-60 ${def.accent} flex-col lg:flex`}>
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-lg">☕</div>
          <div>
            <div className={`text-sm font-extrabold leading-tight ${def.accentText}`}>PU CafeConnect</div>
            <div className="text-[11px] text-white/60">{label}</div>
          </div>
        </div>

        <nav className="mt-3 flex-1 space-y-1 overflow-y-auto px-3">
          {nav.map((item) => {
            const active = isActive(item);
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

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-bold text-white">
              {userName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-white">{userName}</div>
              {userMeta ? <div className="truncate text-[11px] text-white/50">{userMeta}</div> : null}
            </div>
          </div>
          <button
            onClick={logout}
            disabled={loggingOut}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-white/20 disabled:opacity-50"
          >
            <LogOut size={14} aria-hidden />
            {loggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>

      {/* topbar */}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-base">☕</div>
            <span className="text-sm font-bold text-navy">PU CafeConnect</span>
          </div>

          <div className="hidden lg:block">
            <div className="text-sm font-semibold text-navy">{label}</div>
            {subtitle ? <div className="text-xs text-slate-500">{subtitle}</div> : null}
          </div>

          <div className="flex items-center gap-2.5">
            <NotificationBell />
            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 sm:flex">
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

        <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10">{children}</main>

        {/* mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-lg items-stretch justify-around">
            {mobile.map((item) => {
              const active = isActive(item);
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

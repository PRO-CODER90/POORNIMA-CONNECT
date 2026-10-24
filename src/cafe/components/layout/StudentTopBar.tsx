'use client';

import Link from 'next/link';
import NotificationBell from '@/cafe/components/NotificationBell';
import BrandMark from './BrandMark';
import UserChip from './UserChip';

export default function StudentTopBar({
  title,
  subtitle,
  userName,
  userMeta,
  onLogout,
  loggingOut,
}: {
  title: string;
  subtitle?: string;
  userName: string;
  userMeta?: string;
  onLogout: () => void;
  loggingOut: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/60 bg-canvas/75 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 sm:px-8 lg:px-12">
        <Link
          href="/student/dashboard"
          className="flex shrink-0 items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pu-500"
        >
          <BrandMark />
          <span className="hidden flex-col leading-none text-pu-900 sm:flex">
            <span className="font-serif text-lg font-semibold tracking-[0.08em]">POORNIMA</span>
            <span className="mt-0.5 font-serif text-[11px] tracking-[0.3em]">UNIVERSITY</span>
          </span>
        </Link>

        <span className="hidden h-9 w-px bg-slate-200 md:block" aria-hidden />

        <div className="hidden min-w-0 sm:block">
          <div className="truncate text-sm font-semibold text-pu-900">{title}</div>
          {subtitle ? <div className="truncate text-xs text-muted">{subtitle}</div> : null}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2.5">
          <NotificationBell variant="student" />
          <UserChip userName={userName} userMeta={userMeta} onLogout={onLogout} loggingOut={loggingOut} />
        </div>
      </div>
    </header>
  );
}

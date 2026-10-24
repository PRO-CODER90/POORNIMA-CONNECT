'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, LogOut, UserCircle } from 'lucide-react';

export function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Avatar + student code pill; opens a small menu with Profile and Sign out. */
export default function UserChip({
  userName,
  userMeta,
  profileHref,
  onLogout,
  loggingOut,
}: {
  userName: string;
  userMeta?: string;
  /** Profile page for this role; omit to hide the menu entry. */
  profileHref?: string;
  onLogout: () => void;
  loggingOut: boolean;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={boxRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Account menu for ${userName}`}
        title={userName}
        className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white py-1.5 pl-1.5 pr-2.5 shadow-sm transition-colors hover:bg-pu-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pu-500"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pu-100 text-xs font-bold text-pu-700">
          {initials(userName)}
        </span>
        {userMeta ? (
          <span className="hidden max-w-28 truncate text-sm font-semibold text-pu-900 sm:inline">{userMeta}</span>
        ) : null}
        <ChevronDown size={16} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200/80 bg-white py-1.5 shadow-xl"
        >
          <div className="border-b border-slate-100 px-4 pb-2.5 pt-1.5">
            <div className="truncate text-sm font-semibold text-ink" title={userName}>
              {userName}
            </div>
            {userMeta ? <div className="truncate text-xs text-muted">{userMeta}</div> : null}
          </div>
          {profileHref ? (
          <Link
            href={profileHref}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-pu-50 focus-visible:bg-pu-50 focus-visible:outline-none"
          >
            <UserCircle size={16} className="text-pu-600" aria-hidden />
            Profile
          </Link>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={onLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink hover:bg-rose-50 hover:text-rose-700 focus-visible:bg-rose-50 focus-visible:outline-none disabled:opacity-50"
          >
            <LogOut size={16} aria-hidden />
            {loggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}

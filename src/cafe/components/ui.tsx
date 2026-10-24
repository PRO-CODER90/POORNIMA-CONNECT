'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

// ── small shared primitives (keep pages lean) ──

type TintTone = 'pink' | 'blue' | 'orange' | 'green';
type LegacyTone = 'default' | 'brand' | 'green' | 'red' | 'blue' | 'navy' | 'amber';

const TINTS: Record<TintTone, string> = {
  pink: 'bg-tint-pink-bg text-tint-pink-fg',
  blue: 'bg-tint-blue-bg text-tint-blue-fg',
  orange: 'bg-tint-orange-bg text-tint-orange-fg',
  green: 'bg-tint-green-bg text-tint-green-fg',
};

/**
 * Metric card. `tint` selects the student-panel look (pastel icon tile);
 * without it the legacy staff/admin card renders with `tone`.
 */
export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = 'default',
  tint,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: ReactNode;
  tone?: LegacyTone;
  tint?: TintTone;
}) {
  if (tint) {
    return (
      <div className="surface flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
        {icon ? (
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14 ${TINTS[tint]}`} aria-hidden>
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 w-full">
          <div className="text-sm font-medium leading-snug text-ink/80">{label}</div>
          <div className="truncate text-2xl font-bold tracking-tight text-ink sm:text-3xl">{value}</div>
          {sub ? <div className="text-xs leading-snug text-muted">{sub}</div> : null}
        </div>
      </div>
    );
  }

  const tones: Record<string, string> = {
    default: 'text-navy',
    brand: 'text-brand-600',
    green: 'text-emerald-700',
    red: 'text-rose-700',
    blue: 'text-sky-700',
    navy: 'text-navy',
    amber: 'text-amber',
  };
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] transition-all hover:border-slate-300">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-xs font-medium text-slate-500">{label}</span>
        {icon ? (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-600">
            {icon}
          </div>
        ) : null}
      </div>
      <div className={`mt-2 truncate text-xl font-bold tracking-tight ${tones[tone]}`}>{value}</div>
      {sub ? <div className="mt-1 truncate text-[11px] text-slate-400">{sub}</div> : null}
    </div>
  );
}

/** Student-panel page title: h1, subtitle, optional right slot. */
export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-3xl font-bold tracking-tight text-ink">{title}</h1>
        {sub ? <p className="mt-1 text-sm text-muted">{sub}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

export function Badge({ tone, children }: { tone: 'gray' | 'blue' | 'indigo' | 'amber' | 'green' | 'red' | 'violet'; children: ReactNode }) {
  const map: Record<string, string> = {
    gray: 'bg-slate-100 text-slate-700 border border-slate-200/70',
    blue: 'bg-sky-50 text-sky-800 border border-sky-200/80',
    indigo: 'bg-indigo-50 text-indigo-800 border border-indigo-200/80',
    amber: 'bg-amber-50 text-amber-900 border border-amber-200/80',
    green: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80',
    red: 'bg-rose-50 text-rose-800 border border-rose-200/80',
    violet: 'bg-violet-50 text-violet-800 border border-violet-200/80',
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${map[tone]}`}>{children}</span>;
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-hidden />
      <div className={`relative z-10 max-h-[92vh] w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function EmptyState({
  emoji,
  icon,
  title,
  sub,
  action,
  surface,
}: {
  emoji?: string;
  icon?: ReactNode;
  title: string;
  sub?: string;
  action?: ReactNode;
  /** Student-panel look (white `surface` card, blue icon tile). */
  surface?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 px-6 py-12 text-center ${
        surface ? 'surface' : 'rounded-xl border border-dashed border-slate-300 bg-white'
      }`}
    >
      {icon ? (
        <div
          className={`mb-1 flex h-12 w-12 items-center justify-center rounded-xl ${
            surface ? 'bg-pu-50 text-pu-600' : 'border border-slate-200/80 bg-slate-50 text-slate-500'
          }`}
        >
          {icon}
        </div>
      ) : emoji ? (
        <div className="text-3xl mb-1">{emoji}</div>
      ) : null}
      <div className={`text-sm font-semibold ${surface ? 'text-ink' : 'text-navy'}`}>{title}</div>
      {sub ? <div className={`max-w-xs text-xs leading-relaxed ${surface ? 'text-muted' : 'text-slate-500'}`}>{sub}</div> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
      <span aria-hidden>⚠️</span> {message}
    </div>
  );
}

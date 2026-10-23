'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

// ── small shared primitives (keep pages lean) ──

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: ReactNode;
  tone?: 'default' | 'brand' | 'green' | 'red' | 'blue' | 'navy' | 'amber';
}) {
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
}: {
  emoji?: string;
  icon?: ReactNode;
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      {icon ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 border border-slate-200/80 text-slate-500 mb-1">
          {icon}
        </div>
      ) : emoji ? (
        <div className="text-3xl mb-1">{emoji}</div>
      ) : null}
      <div className="text-sm font-semibold text-navy">{title}</div>
      {sub ? <div className="max-w-xs text-xs text-slate-500 leading-relaxed">{sub}</div> : null}
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

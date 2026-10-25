'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/cafe/components/ui';

type Mode = 'AUTO' | 'OPEN' | 'CLOSED';

const LABEL: Record<Mode, string> = { AUTO: 'Auto', OPEN: 'Open', CLOSED: 'Closed' };

/** Staff switch for their cafe: Auto follows the timings (closed on Sundays), Open/Closed override it. */
export default function CafeStatusSwitch({
  manualStatus,
  status,
  hours,
}: {
  manualStatus: string | null;
  status: 'OPEN' | 'CLOSED';
  hours: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<Mode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mode: Mode = manualStatus === 'OPEN' || manualStatus === 'CLOSED' ? manualStatus : 'AUTO';
  const isOpen = status === 'OPEN';

  const set = async (next: Mode) => {
    if (next === mode) return;
    setBusy(next);
    setError(null);
    try {
      const r = await fetch('/api/staff/cafe-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manualStatus: next === 'AUTO' ? null : next }),
      });
      if (!r.ok) throw new Error();
      router.refresh();
    } catch {
      setError('Could not update the status. Try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="surface flex flex-col gap-2 p-3 sm:items-end">
      <div className="flex items-center gap-2 text-sm">
        <span className={`h-2.5 w-2.5 rounded-full ${isOpen ? 'bg-emerald-500' : 'bg-rose-500'}`} aria-hidden />
        <span className="font-bold text-slate-900">{isOpen ? 'Open for orders' : 'Closed for orders'}</span>
        <span className="text-xs text-slate-500">
          {mode === 'AUTO' ? `· Auto (${hours}, closed Sundays)` : '· Set manually'}
        </span>
      </div>
      <div className="flex gap-1.5" role="group" aria-label="Cafe status">
        {(['AUTO', 'OPEN', 'CLOSED'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => set(v)}
            disabled={busy !== null}
            aria-pressed={mode === v}
            className={`min-w-16 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-60 ${
              mode === v
                ? v === 'OPEN'
                  ? 'bg-emerald-600 text-white'
                  : v === 'CLOSED'
                    ? 'bg-rose-600 text-white'
                    : 'bg-pu-600 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            {busy === v ? <Spinner className="mx-auto h-3 w-3" /> : LABEL[v]}
          </button>
        ))}
      </div>
      {error ? <p className="text-xs font-medium text-rose-600" role="alert">{error}</p> : null}
    </div>
  );
}

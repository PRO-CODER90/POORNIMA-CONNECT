'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/cafe/components/ui';

export default function QuickCafeControl({ cafeId, manualStatus }: { cafeId: string; manualStatus: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const set = async (value: string) => {
    setBusy(value);
    try {
      const r = await fetch(`/api/admin/cafes/${cafeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manualStatus: value === 'AUTO' ? null : value }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed');
      router.refresh();
    } catch {
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex gap-2">
      {(['AUTO', 'OPEN', 'CLOSED'] as const).map((v) => (
        <button
          key={v}
          onClick={() => set(v)}
          disabled={busy !== null}
          className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
            (v === 'AUTO' ? manualStatus === null : manualStatus === v)
              ? 'bg-pu-600 text-white'
              : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
          } disabled:opacity-50`}
          aria-pressed={v === 'AUTO' ? manualStatus === null : manualStatus === v}
        >
          {busy === v ? <Spinner className="h-3 w-3" /> : v === 'AUTO' ? 'Auto' : v === 'OPEN' ? 'Force Open' : 'Force Closed'}
        </button>
      ))}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner, ErrorNote } from '@/cafe/components/ui';

export default function CafeSettingsForm({ cafe }: { cafe: {
  id: string; name: string; location: string; description: string; coverEmoji: string;
  openingTime: string; closingTime: string; manualStatus: string | null; isActive: boolean;
} }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: cafe.name,
    location: cafe.location,
    description: cafe.description,
    coverEmoji: cafe.coverEmoji,
    openingTime: cafe.openingTime,
    closingTime: cafe.closingTime,
    manualStatus: cafe.manualStatus ?? '',
    isActive: cafe.isActive,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const r = await fetch(`/api/admin/cafes/${cafe.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, manualStatus: form.manualStatus === '' ? null : form.manualStatus }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Could not save cafe settings.');
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save cafe settings.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="cf-name">Cafe name</label>
          <input id="cf-name" className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        </div>
        <div>
          <label className="label" htmlFor="cf-loc">Location</label>
          <input id="cf-loc" className="input" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
        </div>
        <div>
          <label className="label" htmlFor="cf-open">Opening time</label>
          <input id="cf-open" type="time" className="input" value={form.openingTime} onChange={(e) => setForm((f) => ({ ...f, openingTime: e.target.value }))} required />
        </div>
        <div>
          <label className="label" htmlFor="cf-close">Closing time</label>
          <input id="cf-close" type="time" className="input" value={form.closingTime} onChange={(e) => setForm((f) => ({ ...f, closingTime: e.target.value }))} required />
        </div>
        <div>
          <label className="label" htmlFor="cf-emoji">Cover emoji</label>
          <input id="cf-emoji" className="input" value={form.coverEmoji} maxLength={4} onChange={(e) => setForm((f) => ({ ...f, coverEmoji: e.target.value }))} />
        </div>
        <div>
          <label className="label" htmlFor="cf-status">Open / closed override</label>
          <select id="cf-status" className="input" value={form.manualStatus} onChange={(e) => setForm((f) => ({ ...f, manualStatus: e.target.value }))}>
            <option value="">Auto (from timings)</option>
            <option value="OPEN">Force OPEN</option>
            <option value="CLOSED">Force CLOSED</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="cf-desc">Description</label>
        <textarea id="cf-desc" className="input min-h-20" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input type="checkbox" className="h-4 w-4 rounded" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
        Cafe active (students can see and order)
      </label>

      {error && <ErrorNote message={error} />}
      {saved && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">✓ Settings saved</div>}

      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? (<><Spinner /> Saving…</>) : 'Save settings'}
      </button>
    </form>
  );
}

'use client';

import { useState } from 'react';
import { ErrorNote, Spinner } from '@/cafe/components/ui';

/** Personal email that also receives password-reset links (alongside the university email). */
export default function RecoveryEmailCard({ initial, universityEmail, hasPassword }: { initial: string | null; universityEmail: string; hasPassword: boolean }) {
  const [saved, setSaved] = useState(initial);
  const [email, setEmail] = useState(initial ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const save = async (e: React.FormEvent, clear = false) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const r = await fetch('/api/me/personal-email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personalEmail: clear ? '' : email, currentPassword: password }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message ?? d.error ?? 'Could not save.');
      setSaved(d.personalEmail ?? null);
      setEmail(d.personalEmail ?? '');
      setPassword('');
      setDone(d.personalEmail ? 'Saved. Reset links will also go to this address.' : 'Removed. Reset links go to your university email only.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="surface p-5 sm:p-6">
      <div className="mb-4 border-b border-slate-100 pb-3">
        <h2 className="text-lg font-bold text-ink">Password recovery email</h2>
        <p className="mt-0.5 text-xs text-muted">
          &ldquo;Forgot password&rdquo; links go to <strong>{universityEmail}</strong>
          {saved ? <> and <strong>{saved}</strong></> : null}.
        </p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-ink/80" htmlFor="re-email">Personal email</label>
          <input id="re-email" type="email" className="input-pu" placeholder="you@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="email" />
        </div>
        {hasPassword ? (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink/80" htmlFor="re-pass">Current password</label>
            <input id="re-pass" type="password" className="input-pu" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </div>
        ) : null}
        {error ? <ErrorNote message={error} /> : null}
        {done ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">{done}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-solid-pu py-2.5" disabled={busy || !email.trim()}>
            {busy ? <Spinner className="h-3.5 w-3.5" /> : null}
            Save recovery email
          </button>
          {saved ? (
            <button type="button" className="btn-outline-pu py-2.5" disabled={busy} onClick={(e) => save(e, true)}>
              Remove
            </button>
          ) : null}
        </div>
        <p className="text-[11px] text-muted">For your security we&apos;ll email your university address whenever this changes.</p>
      </div>
    </form>
  );
}

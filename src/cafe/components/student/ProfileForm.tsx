'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner, ErrorNote } from '@/cafe/components/ui';

export default function ProfileForm({
  name,
  email,
  phone,
  studentCode,
  department,
  course,
  year,
}: {
  name: string;
  email: string;
  phone: string | null;
  studentCode: string;
  department: string;
  course: string;
  year: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ name, email, phone: phone ?? '' });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const r = await fetch('/api/student/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? 'Could not save profile.');
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Edit form */}
      <form onSubmit={save} className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] sm:p-6">
        <div className="border-b border-slate-100 pb-3 mb-4">
          <h2 className="text-base font-bold text-navy">Edit Contact Details</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Keep your email and phone number updated for order notifications.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5" htmlFor="pf-name">
              Full Name
            </label>
            <input
              id="pf-name"
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-navy placeholder:text-slate-400 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber/40 transition-colors"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              minLength={2}
              maxLength={80}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5" htmlFor="pf-email">
              University Email Address
            </label>
            <input
              id="pf-email"
              type="email"
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-navy placeholder:text-slate-400 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber/40 transition-colors"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5" htmlFor="pf-phone">
              Mobile Phone Number (Optional)
            </label>
            <input
              id="pf-phone"
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-navy placeholder:text-slate-400 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber/40 transition-colors"
              placeholder="+91 98765 43210"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
        </div>

        {error && (
          <div className="mt-4">
            <ErrorNote message={error} />
          </div>
        )}

        {saved && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800">
            ✓ Profile contact details saved successfully.
          </div>
        )}

        <button
          type="submit"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-navy py-2.5 text-xs font-semibold text-white transition-colors hover:bg-navy-700 disabled:opacity-50"
          disabled={busy}
        >
          {busy ? (
            <>
              <Spinner className="h-3.5 w-3.5" />
              <span>Saving Changes…</span>
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </form>

      {/* Official University Record */}
      <div className="h-fit rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] sm:p-6">
        <div className="border-b border-slate-100 pb-3 mb-4">
          <h2 className="text-base font-bold text-navy">Official Academic Record</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Verified university credentials managed by the university registrar.
          </p>
        </div>

        <div className="mb-4 rounded-lg border border-slate-100 bg-[#F8F7F3] px-3.5 py-2.5 text-[11px] leading-relaxed text-slate-500">
          Academic attributes are read-only and automatically linked to your student identification. Contact the registrar office to update branch or year.
        </div>

        <dl className="divide-y divide-slate-100 text-xs">
          <Row k="Student Roll Code" v={<span className="font-mono font-bold text-navy">{studentCode}</span>} />
          <Row k="Academic Department" v={department} />
          <Row k="Program & Course" v={course} />
          <Row k="Current Year" v={`Year ${year}`} />
          <Row k="Portal Account Role" v={<span className="inline-flex items-center gap-1 font-semibold text-navy">Student</span>} />
        </dl>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3">
      <dt className="text-xs font-medium text-slate-500">{k}</dt>
      <dd className="font-medium text-slate-800">{v}</dd>
    </div>
  );
}

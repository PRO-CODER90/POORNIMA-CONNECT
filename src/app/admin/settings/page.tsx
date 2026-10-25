import { requireAdminPage } from '@/cafe/lib/rbac';
import { prisma } from '@/cafe/lib/db';
import { cafeOpenState } from '@/cafe/lib/cafe';
import { fmtTime12 } from '@/cafe/utils/format';
import { OpenBadge } from '@/cafe/components/status';
import QuickCafeControl from '@/cafe/components/admin/QuickCafeControls';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Admin · Settings' };

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  await requireAdminPage();
  const cafes = await prisma.cafe.findMany({ orderBy: { code: 'asc' } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">System configuration and quick cafe controls.</p>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-sm font-extrabold text-slate-900">Cafes — quick open/close</h2>
        <p className="mb-4 text-xs text-slate-500">
          Status is automatic from the configured timings; you can force OPEN or CLOSED for a cafe (e.g. during maintenance or a special event).
        </p>
        <div className="space-y-3">
          {cafes.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <span className="text-xl" aria-hidden>{c.coverEmoji}</span> {c.name}
                  <OpenBadge status={cafeOpenState(c)} />
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {c.location} · {fmtTime12(c.openingTime)}–{fmtTime12(c.closingTime)}
                  {c.manualStatus ? ` · override: ${c.manualStatus}` : ' · auto'}
                </div>
              </div>
              <QuickCafeControl cafeId={c.id} manualStatus={c.manualStatus} />
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5 text-sm">
        <h2 className="mb-3 text-sm font-extrabold text-slate-900">System</h2>
        <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
          <div className="flex justify-between"><dt className="text-slate-500">Platform</dt><dd className="font-bold">PU CafeConnect v1.0</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Institution</dt><dd className="font-bold">Poornima University</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Configured cafes</dt><dd className="font-bold">{cafes.length} (scalable — add more without code changes)</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Payment method</dt><dd className="font-bold">CASH at cafe (digitally tracked)</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Online payment gateway</dt><dd className="font-bold text-emerald-600">Not used (by design)</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Timezone</dt><dd className="font-bold">Asia/Kolkata (IST)</dd></div>
        </dl>
      </div>
    </div>
  );
}

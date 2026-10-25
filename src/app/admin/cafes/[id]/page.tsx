import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireAdminPage } from '@/cafe/lib/rbac';
import { adminCafeDetail } from '@/cafe/server/admin/dashboard';
import { StatCard, EmptyState } from '@/cafe/components/ui';
import { OpenBadge } from '@/cafe/components/status';
import { inr } from '@/cafe/lib/money';
import { fmtDate, fmtTime } from '@/cafe/lib/dates';
import { fmtTime12 } from '@/cafe/utils/format';
import CafeQR from '@/cafe/components/qr/CafeQR';
import CafeSettingsForm from '@/cafe/components/admin/CafeSettingsForm';
import AdminCafeCharts from '@/cafe/components/admin/CafeCharts';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Admin · Cafe Details' };

export const dynamic = 'force-dynamic';

export default async function AdminCafeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPage();
  const { id } = await params;
  const d = await adminCafeDetail(admin, id);
  if (!d) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/cafes" className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800">
            <ArrowLeft size={14} aria-hidden /> All cafes
          </Link>
          <h1 className="flex flex-wrap items-center gap-3 text-xl font-black text-slate-900 sm:text-2xl">
            <span className="text-3xl" aria-hidden>{d.cafe.coverEmoji}</span> {d.cafe.name}
            <OpenBadge status={d.cafe.status} />
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {d.cafe.location} · {fmtTime12(d.cafe.openingTime)}–{fmtTime12(d.cafe.closingTime)}
            {d.cafe.manualStatus ? ` · override: ${d.cafe.manualStatus}` : ''}
          </p>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Cafe stats">
        <StatCard label="Orders Today" value={d.stats.today.orders} sub={`all-time ${d.stats.allTime.orders}`} icon="🧾" />
        <StatCard label="Revenue Today" value={inr(d.stats.today.revenue)} icon="💰" tone="brand" />
        <StatCard label="Pending Cash (today)" value={inr(d.stats.today.pending)} tone={d.stats.today.pending > 0 ? 'red' : 'green'} icon="⏳" />
        <StatCard label="All-Time Revenue" value={inr(d.stats.allTime.revenue)} sub={`${d.stats.allTime.items} items sold`} icon="📈" tone="green" />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <AdminCafeCharts daily={d.dailySales} monthly={d.monthlySales} categorySales={d.categorySales} />

          <div className="card p-5">
            <h3 className="mb-3 text-sm font-extrabold text-slate-900">Popular items</h3>
            {d.popularItems.length === 0 ? (
              <EmptyState emoji="🍽️" title="No item sales yet" />
            ) : (
              <div className="space-y-2">
                {d.popularItems.map((it, i) => (
                  <div key={it.name} className="flex items-center gap-3 rounded-xl bg-pu-50/60 px-3 py-2">
                    <span className="w-5 text-center text-xs font-black text-slate-400">{i + 1}</span>
                    <span className="flex-1 truncate text-sm font-bold text-slate-800">{it.name}</span>
                    <span className="text-xs text-slate-400">{it.quantity} sold</span>
                    <span className="text-sm font-black">{inr(it.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5">
            <h3 className="mb-3 text-sm font-extrabold text-slate-900">Staff at this cafe</h3>
            {d.staff.length === 0 ? (
              <EmptyState emoji="👨‍🍳" title="No staff assigned" sub="Assign staff from the Cafe Staff page." />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {d.staff.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-black text-indigo-700">
                      {s.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-slate-800">{s.name}</div>
                      <div className="truncate text-[11px] text-slate-400">{s.staffCode} · {s.email}</div>
                    </div>
                    <div className="text-[10px] text-slate-400">last login {s.lastLogin ? fmtTime(new Date(s.lastLogin)) : 'never'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <CafeQR cafeCode={d.cafe.code} cafeName={d.cafe.name} appUrl={process.env.APP_URL} />
          <div className="card p-5">
            <h3 className="mb-4 text-sm font-extrabold text-slate-900">Cafe settings</h3>
            <CafeSettingsForm
              cafe={{
                id: d.cafe.id,
                name: d.cafe.name,
                location: d.cafe.location,
                description: d.cafe.description,
                coverEmoji: d.cafe.coverEmoji,
                openingTime: d.cafe.openingTime,
                closingTime: d.cafe.closingTime,
                manualStatus: d.cafe.manualStatus,
                isActive: d.cafe.isActive,
              }}
            />
          </div>
          <div className="card p-5 text-xs text-slate-500">
            <h3 className="mb-2 text-sm font-extrabold text-slate-900">Cash reconciliation — all time</h3>
            <dl className="space-y-1.5">
              <div className="flex justify-between"><dt>Expected cash</dt><dd className="font-bold">{inr(d.stats.allTime.revenue)}</dd></div>
              <div className="flex justify-between"><dt>Cash received (paid)</dt><dd className="font-bold text-emerald-600">{inr(d.stats.allTime.collected)}</dd></div>
              <div className="flex justify-between"><dt>Pending</dt><dd className={`font-bold ${d.stats.allTime.pending > 0 ? 'text-rose-600' : ''}`}>{inr(d.stats.allTime.pending)}</dd></div>
              <div className="flex justify-between"><dt>Orders</dt><dd className="font-bold">{d.stats.allTime.orders}</dd></div>
            </dl>
            <p className="mt-2 text-[10px] text-slate-400">Updated automatically. Cancelled orders excluded. Data as of {fmtDate(new Date())}.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

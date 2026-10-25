import { requireAdminPage } from '@/cafe/lib/rbac';
import { adminAnalytics } from '@/cafe/server/admin/analytics';
import { inr } from '@/cafe/lib/money';
import { StatCard } from '@/cafe/components/ui';
import { fmtDate } from '@/cafe/lib/dates';
import AnalyticsCharts from '@/cafe/components/admin/AnalyticsCharts';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Admin · Revenue Analytics' };

export const dynamic = 'force-dynamic';

export default async function AdminAnalyticsPage() {
  const admin = await requireAdminPage();
  const d = await adminAnalytics(admin, { days: 30 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Revenue Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">Last 30 days · valid orders only (cancelled excluded).</p>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Analytics totals">
        <StatCard label="Revenue (30d)" value={inr(d.totals.revenue)} icon="💰" tone="brand" />
        <StatCard label="Orders (30d)" value={d.totals.orders} icon="🧾" />
        <StatCard label="Items Sold (30d)" value={d.totals.items.toLocaleString('en-IN')} icon="🍽️" />
        <StatCard label="Top Cafe" value={d.byCafe[0]?.name.split('·')[0].trim() ?? '—'} sub={inr(d.byCafe[0]?.revenue ?? 0)} icon="🏆" tone="green" />
      </section>

      <AnalyticsCharts
        byDay={d.byDay.map((x) => ({ label: fmtDate(x.date), value: x.value }))}
        byWeek={d.byWeek}
        byMonth={d.byMonth.map((x) => ({ label: x.month, value: x.value }))}
        byCafe={d.byCafe.map((x) => ({ label: x.name, value: x.revenue }))}
        byCategory={d.byCategory.map((x) => ({ name: x.name, value: x.total }))}
      />

      {/* cafe comparison */}
      <div className="card overflow-x-auto">
        <h3 className="px-4 pt-4 text-sm font-extrabold text-slate-900">Cafe comparison (30 days)</h3>
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5">Cafe</th>
              <th className="px-4 py-2.5 text-right">Orders</th>
              <th className="px-4 py-2.5 text-right">Revenue</th>
              <th className="px-4 py-2.5 text-right">Items Sold</th>
            </tr>
          </thead>
          <tbody>
            {d.byCafe.map((c) => (
              <tr key={c.id} className="border-b border-slate-50">
                <td className="px-4 py-2.5 font-bold">{c.coverEmoji} {c.name}</td>
                <td className="px-4 py-2.5 text-right font-semibold">{c.orders}</td>
                <td className="px-4 py-2.5 text-right font-black">{inr(c.revenue)}</td>
                <td className="px-4 py-2.5 text-right font-semibold">{c.items}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* item analytics */}
      <div className="card overflow-x-auto">
        <h3 className="px-4 pt-4 text-sm font-extrabold text-slate-900">Top items (30 days)</h3>
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5">Item</th>
              <th className="px-4 py-2.5 text-right">Quantity Sold</th>
              <th className="px-4 py-2.5 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {d.byItem.slice(0, 15).map((i) => (
              <tr key={i.name} className="border-b border-slate-50">
                <td className="px-4 py-2.5 font-semibold">{i.name}</td>
                <td className="px-4 py-2.5 text-right font-semibold">{i.quantity}</td>
                <td className="px-4 py-2.5 text-right font-black">{inr(i.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

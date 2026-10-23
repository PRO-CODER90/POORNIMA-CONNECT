import { requireStaffPage } from '@/cafe/lib/rbac';
import { staffHistory } from '@/cafe/server/staff';
import { inr } from '@/cafe/lib/money';
import { StatCard, EmptyState } from '@/cafe/components/ui';
import { fmtDate } from '@/cafe/lib/dates';
import { BarTrend } from '@/cafe/components/charts';

export const dynamic = 'force-dynamic';

export default async function StaffHistoryPage() {
  const auth = await requireStaffPage();
  const cafe = auth.cafe;
  const d = await staffHistory(auth, 7);

  return (
    <div>
      <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Cafe Order History</h1>
      <p className="mb-5 mt-1 text-sm text-slate-500">{cafe.name} · last 7 days</p>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Valid Orders" value={d.recon.validOrders} icon="🧾" />
        <StatCard label="Revenue (sales)" value={inr(d.recon.expectedCash)} icon="💰" tone="brand" />
        <StatCard label="Cash Collected" value={inr(d.recon.collectedCash)} icon="🟢" tone="green" />
        <StatCard label="Pending Cash" value={inr(d.recon.pendingCash)} icon="🟡" tone={d.recon.pendingCash > 0 ? 'red' : 'default'} />
      </section>

      <div className="card mt-4 p-5">
        <h2 className="mb-3 text-sm font-extrabold text-slate-900">Daily sales</h2>
        {d.daily.length === 0 ? (
          <EmptyState emoji="📊" title="No sales recorded for this period" />
        ) : (
          <BarTrend data={d.daily.map((x) => ({ label: fmtDate(x.date), value: x.revenue }))} />
        )}
      </div>

      <div className="card mt-4 p-5">
        <h2 className="mb-2 text-sm font-extrabold text-slate-900">Cancelled orders</h2>
        <p className="text-xs text-slate-500">{d.recon.cancelledOrders} cancelled in the last 7 days — excluded from revenue.</p>
      </div>
    </div>
  );
}

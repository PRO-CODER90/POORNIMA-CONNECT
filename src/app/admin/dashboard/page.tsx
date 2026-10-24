import Link from 'next/link';
import { requireAdminPage } from '@/cafe/lib/rbac';
import { adminDashboard } from '@/cafe/server/admin/dashboard';
import { StatCard } from '@/cafe/components/ui';
import { OpenBadge } from '@/cafe/components/status';
import { inr } from '@/cafe/lib/money';
import AdminDashboardCharts from '@/cafe/components/admin/DashboardCharts';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const admin = await requireAdminPage();
  const d = await adminDashboard(admin);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-900 sm:text-2xl">University Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Live view across all three cafes, orders, cash and students.</p>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Key metrics">
        <StatCard label="Total Revenue (all time)" value={inr(d.cards.totalRevenue)} sub="valid orders, excl. cancelled" icon="💰" tone="brand" />
        <StatCard label="Today's Revenue" value={inr(d.cards.todayRevenue)} sub={`cash collected ${inr(d.cards.todayCashCollected)}`} icon="📈" />
        <StatCard label="Today's Orders" value={d.cards.todayOrders} icon="🧾" tone="blue" />
        <StatCard label="Pending Cash (today)" value={inr(d.cards.pendingCash)} tone={d.cards.pendingCash > 0 ? 'red' : 'green'} icon="⏳" />
        <StatCard label="Students Served" value={d.cards.studentsServed} sub="registered students" icon="🎓" />
        <StatCard label="Total Items Sold" value={d.cards.totalItemsSold.toLocaleString('en-IN')} icon="🍽️" />
        <StatCard label="Active Cafes" value={d.cards.activeCafes} sub="of 3 configured" icon="☕" tone="green" />
        <StatCard label="Paid Orders (today)" value={d.cards.paidOrdersToday} icon="🟢" />
      </section>

      {/* cafe overview */}
      <section aria-labelledby="cafe-overview">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="cafe-overview" className="text-base font-extrabold text-slate-900">Cafe Overview — today</h2>
          <Link href="/admin/cafes" className="text-xs font-bold text-indigo-600 hover:underline">Manage cafes →</Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {d.cafes.map((c) => (
            <Link key={c.id} href={`/admin/cafes/${c.id}`} className="card p-4 transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <span className="text-xl" aria-hidden>{c.coverEmoji}</span> {c.name}
                </span>
                <OpenBadge status={c.status} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-pu-50/60 p-2">
                  <div className="text-base font-black">{c.today.orders}</div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Orders</div>
                </div>
                <div className="rounded-xl bg-pu-50/60 p-2">
                  <div className="text-base font-black">{inr(c.today.revenue)}</div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Revenue</div>
                </div>
                <div className="rounded-xl bg-pu-50/60 p-2">
                  <div className={`text-base font-black ${c.today.pending > 0 ? 'text-rose-600' : ''}`}>{inr(c.today.pending)}</div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Pending</div>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-slate-400">{c.location} · {c.staffCount} staff · {c.itemCount} menu items</div>
            </Link>
          ))}
        </div>
      </section>

      <AdminDashboardCharts revenueLast7={d.revenueLast7} />
    </div>
  );
}

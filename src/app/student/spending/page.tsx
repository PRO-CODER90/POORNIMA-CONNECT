import { requireStudentPage } from '@/cafe/lib/rbac';
import { studentSpending } from '@/cafe/server/student';
import { StatCard, EmptyState } from '@/cafe/components/ui';
import { inr } from '@/cafe/lib/money';
import { dateKey } from '@/cafe/lib/dates';
import SpendingCharts from '@/cafe/components/student/SpendingCharts';
import { Wallet, Calendar, CalendarDays, TrendingUp } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function StudentSpendingPage() {
  const auth = await requireStudentPage();
  void auth.student;
  const d = await studentSpending(auth);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">My Spending Analytics</h1>
        <p className="mt-1 text-xs text-slate-500">
          Personal dining expenditure breakdown and historical trends across campus cafes.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3.5 lg:grid-cols-4" aria-label="Spending summary metrics">
        <StatCard
          label="Today's Spending"
          value={inr(d.summary.today)}
          sub="Spent today"
          icon={<Wallet size={16} className="text-amber" />}
          tone="amber"
        />
        <StatCard
          label="This Week"
          value={inr(d.summary.week)}
          sub="Last 7 days"
          icon={<Calendar size={16} className="text-navy" />}
          tone="navy"
        />
        <StatCard
          label="This Month"
          value={inr(d.summary.month)}
          sub="Current calendar month"
          icon={<CalendarDays size={16} className="text-sky-600" />}
          tone="blue"
        />
        <StatCard
          label="Total Spending"
          value={inr(d.summary.total)}
          sub={`${d.summary.ordersTotal} lifetime orders`}
          icon={<TrendingUp size={16} className="text-emerald-600" />}
          tone="green"
        />
      </section>

      {d.summary.total === 0 ? (
        <EmptyState
          icon={<Wallet size={24} />}
          title="No spending recorded yet"
          sub="Place your first cafe order to generate your personal expenditure breakdown."
        />
      ) : (
        <>
          {/* Cafe-wise breakdown */}
          <section className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] sm:p-6" aria-labelledby="cafe-wise">
            <h2 id="cafe-wise" className="mb-4 text-sm font-bold text-navy">
              Campus Cafe Expenditure Breakdown
            </h2>
            <div className="grid gap-3.5 sm:grid-cols-3">
              {d.byCafe.map((c) => {
                const percentage = d.summary.total ? Math.round((c.total / d.summary.total) * 100) : 0;
                return (
                  <div key={c.id} className="rounded-xl border border-slate-100 bg-[#F8F7F3] p-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-navy">
                      <span className="truncate">{c.name}</span>
                      <span className="font-mono text-[11px] text-slate-400">{percentage}%</span>
                    </div>
                    <div className="mt-2 font-mono text-xl font-bold text-navy">{inr(c.total)}</div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      {c.orders} order{c.orders === 1 ? '' : 's'} placed
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-amber transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Charts grid */}
          <SpendingCharts
            daily={d.daily.map((x) => ({ label: x.date.slice(5), value: x.value, _raw: x.date }))}
            monthly={d.monthly.map((x) => ({ label: x.month, value: x.value, _raw: x.month }))}
            byCategory={d.byCategory.map((x) => ({ name: x.name, value: x.total }))}
            byCafe={d.byCafe.map((x) => ({ name: x.name, value: x.total }))}
          />
        </>
      )}

      <p className="text-center text-[11px] text-slate-400">
        Figures exclude cancelled orders · Verified against university ledger as of {dateKey()}
      </p>
    </div>
  );
}

import { requireStudentPage } from '@/cafe/lib/rbac';
import { studentSpending } from '@/cafe/server/student';
import { StatCard, EmptyState, PageHeader } from '@/cafe/components/ui';
import { inr } from '@/cafe/lib/money';
import { dateKey } from '@/cafe/lib/dates';
import SpendingCharts from '@/cafe/components/student/SpendingCharts';
import { Wallet, Calendar, CalendarDays, TrendingUp } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'My Spending' };

export const dynamic = 'force-dynamic';

export default async function StudentSpendingPage() {
  const auth = await requireStudentPage();
  void auth.student;
  const d = await studentSpending(auth);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Spending Analytics"
        sub="Personal dining expenditure breakdown and historical trends across campus cafes."
      />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Spending summary metrics">
        <StatCard
          label="Today's Spending"
          value={inr(d.summary.today)}
          sub="Spent today"
          icon={<Wallet size={24} />}
          tint="pink"
        />
        <StatCard
          label="This Week"
          value={inr(d.summary.week)}
          sub="Last 7 days"
          icon={<Calendar size={24} />}
          tint="blue"
        />
        <StatCard
          label="This Month"
          value={inr(d.summary.month)}
          sub="Current calendar month"
          icon={<CalendarDays size={24} />}
          tint="orange"
        />
        <StatCard
          label="Total Spending"
          value={inr(d.summary.total)}
          sub={`${d.summary.ordersTotal} lifetime orders`}
          icon={<TrendingUp size={24} />}
          tint="green"
        />
      </section>

      {d.summary.total === 0 ? (
        <EmptyState
          surface
          icon={<Wallet size={24} />}
          title="No spending recorded yet"
          sub="Place your first cafe order to generate your personal expenditure breakdown."
        />
      ) : (
        <>
          {/* Cafe-wise breakdown */}
          <section className="surface p-5 sm:p-6" aria-labelledby="cafe-wise">
            <h2 id="cafe-wise" className="mb-4 text-base font-bold text-ink">
              Campus Cafe Expenditure Breakdown
            </h2>
            <div className="grid gap-3.5 sm:grid-cols-3">
              {d.byCafe.map((c) => {
                const percentage = d.summary.total ? Math.round((c.total / d.summary.total) * 100) : 0;
                return (
                  <div key={c.id} className="rounded-xl border border-pu-100 bg-pu-50/60 p-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-ink">
                      <span className="truncate">{c.name}</span>
                      <span className="font-mono text-[11px] text-muted">{percentage}%</span>
                    </div>
                    <div className="mt-2 font-mono text-xl font-bold text-ink">{inr(c.total)}</div>
                    <div className="mt-0.5 text-[11px] text-muted">
                      {c.orders} order{c.orders === 1 ? '' : 's'} placed
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-pu-600 transition-all duration-500"
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

      <p className="text-center text-[11px] text-muted">
        Figures exclude cancelled orders · Verified against university ledger as of {dateKey()}
      </p>
    </div>
  );
}

import { requireStudentPage } from '@/cafe/lib/rbac';
import { studentDashboard } from '@/cafe/server/student';
import CafeCard from '@/cafe/components/CafeCard';
import { StatCard, EmptyState } from '@/cafe/components/ui';
import { OrderStatusBadge, PaymentBadge } from '@/cafe/components/status';
import { inr } from '@/cafe/lib/money';
import { timeAgo } from '@/cafe/lib/dates';
import Link from 'next/link';
import { Coffee, ShoppingBag, Receipt, TrendingUp, Wallet, ArrowRight, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function StudentDashboardPage() {
  const auth = await requireStudentPage();
  const student = auth.student;
  const d = await studentDashboard(auth);

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
            Welcome, {student.name}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>
              Student ID: <span className="font-mono font-semibold text-navy">{student.studentCode}</span>
            </span>
            <span className="hidden sm:inline" aria-hidden>·</span>
            <span>Campus Dining Portal</span>
          </p>
        </div>
        <Link
          href="/student/cafes"
          className="mt-2 inline-flex items-center gap-1.5 self-start rounded-lg bg-navy px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-navy-700 sm:mt-0"
        >
          <Coffee size={14} aria-hidden />
          <span>Browse Menus</span>
        </Link>
      </div>

      {/* Stats overview */}
      <section aria-label="Student overview metrics" className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard
          label="Today's Spending"
          value={inr(d.stats.todaySpending)}
          sub={`${d.stats.ordersToday} order${d.stats.ordersToday === 1 ? '' : 's'} today`}
          icon={<Wallet size={16} className="text-amber" />}
          tone="amber"
        />
        <StatCard
          label="Orders Today"
          value={d.stats.ordersToday}
          sub="Current shift orders"
          icon={<ShoppingBag size={16} className="text-navy" />}
          tone="navy"
        />
        <StatCard
          label="Total Orders"
          value={d.stats.totalOrders}
          sub="All-time campus orders"
          icon={<Receipt size={16} className="text-sky-600" />}
          tone="blue"
        />
        <StatCard
          label="Total Spending"
          value={inr(d.stats.totalSpending)}
          sub="Cumulative balance spent"
          icon={<TrendingUp size={16} className="text-emerald-600" />}
          tone="green"
        />
      </section>

      {/* Campus Cafes Section */}
      <section aria-labelledby="cafes-heading">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 id="cafes-heading" className="text-lg font-bold text-navy">
              Campus Cafes
            </h2>
            <p className="text-xs text-slate-500">Choose a location to view live items and order with cash</p>
          </div>
          <Link
            href="/student/cafes"
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber hover:text-amber-hover transition-colors"
          >
            <span>View all directory</span>
            <ArrowRight size={13} aria-hidden />
          </Link>
        </div>

        {d.cafes.length === 0 ? (
          <EmptyState
            icon={<Coffee size={24} />}
            title="No cafes currently available"
            sub="The university canteen administration is updating cafe schedules. Please check back shortly."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {d.cafes.map((c) => (
              <CafeCard key={c.id} cafe={c} />
            ))}
          </div>
        )}
      </section>

      {/* Recent Orders Section */}
      <section aria-labelledby="recent-heading">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 id="recent-heading" className="text-lg font-bold text-navy">
              Recent Orders
            </h2>
            <p className="text-xs text-slate-500">Track your pending cash orders and view receipts</p>
          </div>
          <Link
            href="/student/orders"
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber hover:text-amber-hover transition-colors"
          >
            <span>See all orders</span>
            <ArrowRight size={13} aria-hidden />
          </Link>
        </div>

        {d.recentOrders.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag size={24} />}
            title="You have no recent orders"
            sub="Pick a campus cafe above to place your first cash order."
            action={
              <Link
                href="/student/cafes"
                className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-navy-700"
              >
                <Coffee size={14} aria-hidden />
                <span>Explore Cafes</span>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {d.recentOrders.map((o) => (
              <Link
                key={o.id}
                href={`/student/orders/${o.id}`}
                className="group block rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] transition-all hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-navy group-hover:text-amber transition-colors">
                        {o.orderNumber}
                      </span>
                      <span className="text-xs text-slate-300" aria-hidden>·</span>
                      <span className="text-xs font-medium text-slate-700">{o.cafe.name}</span>
                      <span className="text-xs text-slate-300" aria-hidden>·</span>
                      <span className="text-xs text-slate-400">{timeAgo(o.createdAt)}</span>
                    </div>

                    <div className="mt-2 line-clamp-1 text-xs text-slate-500">
                      {o.items.map((i) => `${i.name} × ${i.quantity}`).join('  ·  ')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-bold text-navy">{inr(o.totalAmount)}</span>
                    <PaymentBadge status={o.paymentStatus} />
                    <OrderStatusBadge status={o.orderStatus} />
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

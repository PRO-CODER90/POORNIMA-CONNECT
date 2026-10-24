import { requireStudentPage } from '@/cafe/lib/rbac';
import { studentDashboard } from '@/cafe/server/student';
import CafeCard from '@/cafe/components/CafeCard';
import PartnerBrand from '@/cafe/components/student/PartnerBrand';
import { StatCard, EmptyState } from '@/cafe/components/ui';
import { OrderStatusBadge, PaymentBadge } from '@/cafe/components/status';
import { inr } from '@/cafe/lib/money';
import { timeAgo } from '@/cafe/lib/dates';
import Image from 'next/image';
import Link from 'next/link';
import { Coffee, ShoppingBag, ShoppingCart, ClipboardList, TrendingUp, Wallet, ArrowRight, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function StudentDashboardPage() {
  const auth = await requireStudentPage();
  const student = auth.student;
  const d = await studentDashboard(auth);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section aria-label="Welcome" className="relative -mx-4 overflow-hidden px-4 sm:mx-0 sm:px-0">
        {/* mobile: a cropped strip of the campus behind the welcome text */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 lg:hidden" aria-hidden>
          <Image
            src="/brand/hero-campus.webp"
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-60 [mask-image:linear-gradient(to_bottom,black_30%,transparent)]"
          />
        </div>

        <div className="relative grid items-center gap-6 pt-24 lg:grid-cols-[1fr_auto] lg:pt-0">
          <div className="min-w-0 lg:py-10">
            <h1 className="text-4xl font-bold tracking-tight text-ink lg:text-5xl">
              Welcome,{' '}
              <span className="break-words text-pu-600" title={student.name}>
                {student.name}
              </span>{' '}
              <span aria-hidden>👋</span>
            </h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span>
                Student ID: <b className="font-semibold text-ink">{student.studentCode}</b>
              </span>
              <span aria-hidden>·</span>
              <span>Campus Dining Portal</span>
            </p>
          </div>

          {/* desktop: campus illustration + optional partner slot */}
          <div className="hidden items-center gap-4 lg:flex" aria-hidden>
            <div className="relative h-52 w-[30rem]">
              <Image
                src="/brand/hero-campus.webp"
                alt=""
                fill
                sizes="480px"
                className="rounded-[2rem] object-cover [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_72%)]"
              />
            </div>
            <PartnerBrand />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section aria-label="Student overview metrics" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Today's Spending"
          value={inr(d.stats.todaySpending)}
          sub={`${d.stats.ordersToday} order${d.stats.ordersToday === 1 ? '' : 's'} today`}
          icon={<Wallet size={24} />}
          tint="pink"
        />
        <StatCard
          label="Orders Today"
          value={d.stats.ordersToday}
          sub="Current shift orders"
          icon={<ClipboardList size={24} />}
          tint="blue"
        />
        <StatCard
          label="Total Orders"
          value={d.stats.totalOrders}
          sub="All-time campus orders"
          icon={<ShoppingCart size={24} />}
          tint="orange"
        />
        <StatCard
          label="Total Spending"
          value={inr(d.stats.totalSpending)}
          sub="Cumulative balance spent"
          icon={<TrendingUp size={24} />}
          tint="green"
        />
      </section>

      {/* Campus Cafes */}
      <section aria-labelledby="cafes-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="cafes-heading" className="text-xl font-bold text-ink">
              Campus Cafes
            </h2>
            <p className="text-sm text-muted">Choose a location to view live items and order with cash</p>
          </div>
          <Link
            href="/student/cafes"
            className="inline-flex items-center gap-1 rounded text-sm font-semibold text-pu-600 transition-colors hover:text-pu-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pu-500"
          >
            View all directory
            <ArrowRight size={15} aria-hidden />
          </Link>
        </div>

        {d.cafes.length === 0 ? (
          <EmptyState
            surface
            icon={<Coffee size={24} />}
            title="No cafes currently available"
            sub="The university canteen administration is updating cafe schedules. Please check back shortly."
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {d.cafes.map((c) => (
              <CafeCard key={c.id} cafe={c} />
            ))}
          </div>
        )}
      </section>

      {/* Recent Orders */}
      <section aria-labelledby="recent-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="recent-heading" className="text-xl font-bold text-ink">
              Recent Orders
            </h2>
            <p className="text-sm text-muted">Track your pending cash orders and view receipts</p>
          </div>
          <Link
            href="/student/orders"
            className="inline-flex items-center gap-1 rounded text-sm font-semibold text-pu-600 transition-colors hover:text-pu-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pu-500"
          >
            See all orders
            <ArrowRight size={15} aria-hidden />
          </Link>
        </div>

        {d.recentOrders.length === 0 ? (
          <EmptyState
            surface
            icon={<ShoppingBag size={24} />}
            title="You have no recent orders"
            sub="Pick a campus cafe above to place your first cash order."
            action={
              <Link href="/student/cafes" className="btn-solid-pu">
                <Coffee size={14} aria-hidden />
                Explore Cafes
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {d.recentOrders.map((o) => (
              <OrderRow key={o.id} o={o} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

type RecentOrder = Awaited<ReturnType<typeof studentDashboard>>['recentOrders'][number];

function OrderRow({ o }: { o: RecentOrder }) {
  return (
    <Link
      href={`/student/orders/${o.id}`}
      className="surface group block p-4 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pu-500"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-full min-w-0 sm:w-auto sm:flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono font-semibold text-pu-600">{o.orderNumber}</span>
            <span className="text-slate-300" aria-hidden>·</span>
            <span className="font-medium text-ink">{o.cafe.name}</span>
            <span className="text-slate-300" aria-hidden>·</span>
            <span className="text-muted">{timeAgo(o.createdAt)}</span>
          </div>
          <div className="mt-2 line-clamp-1 text-xs text-muted">
            {o.items.map((i) => `${i.name} × ${i.quantity}`).join('  ·  ')}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="font-mono text-sm font-bold text-ink">{inr(o.totalAmount)}</span>
          <PaymentBadge status={o.paymentStatus} />
          <OrderStatusBadge status={o.orderStatus} />
          <ChevronRight size={16} className="text-slate-300 transition-colors group-hover:text-pu-600" aria-hidden />
        </div>
      </div>
    </Link>
  );
}

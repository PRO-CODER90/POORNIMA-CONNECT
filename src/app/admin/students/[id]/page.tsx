import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireAdminPage } from '@/cafe/lib/rbac';
import { adminStudentDetail } from '@/cafe/server/admin/students';
import { StatCard, Badge } from '@/cafe/components/ui';
import { OrderStatusBadge, PaymentBadge } from '@/cafe/components/status';
import { inr } from '@/cafe/lib/money';
import { fmtDateTime } from '@/cafe/lib/dates';
import AdminStudentCharts from '@/cafe/components/admin/StudentCharts';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Admin · Student Details' };

export const dynamic = 'force-dynamic';

export default async function AdminStudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPage();
  const { id } = await params;
  const d = await adminStudentDetail(admin, id);
  if (!d) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/students" className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800">
          <ArrowLeft size={14} aria-hidden /> All students
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-lg font-black text-indigo-700">
            {d.student.name.slice(0, 1)}
          </div>
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-black text-slate-900">
              {d.student.name} <Badge tone={d.student.status === 'ACTIVE' ? 'green' : 'red'}>{d.student.status}</Badge>
            </h1>
            <p className="text-sm text-slate-500">
              <span className="font-mono font-bold">{d.student.studentCode}</span> · {d.student.course} · {d.student.department} · Year {d.student.year}
            </p>
          </div>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Student spending">
        <StatCard label="Today's Spending" value={inr(d.spending.today)} icon="🧾" tone="brand" />
        <StatCard label="This Week" value={inr(d.spending.week)} icon="📅" />
        <StatCard label="This Month" value={inr(d.spending.month)} icon="🗓️" />
        <StatCard label="Total Spending" value={inr(d.spending.total)} sub={`${d.spending.totalOrders} orders`} icon="💰" tone="green" />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <AdminStudentCharts byCafe={d.byCafe} byCategory={d.byCategory} />

          <div className="card overflow-x-auto">
            <h3 className="px-4 pt-4 text-sm font-extrabold text-slate-900">Complete order history</h3>
            {d.orders.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-400">No orders yet.</p>
            ) : (
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2.5">Order</th>
                    <th className="px-4 py-2.5">Cafe</th>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                    <th className="px-4 py-2.5">Payment</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {d.orders.map((o) => (
                    <tr key={o.id} className="border-b border-slate-50">
                      <td className="px-4 py-2.5 font-mono text-xs font-bold">{o.orderNumber}</td>
                      <td className="px-4 py-2.5 text-xs font-semibold">{o.cafe.name}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{fmtDateTime(o.createdAt)}</td>
                      <td className="px-4 py-2.5 text-right font-black">{inr(o.totalAmount)}</td>
                      <td className="px-4 py-2.5"><PaymentBadge status={o.paymentStatus} method={o.paymentMethod} /></td>
                      <td className="px-4 py-2.5"><OrderStatusBadge status={o.orderStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="mb-3 text-sm font-extrabold text-slate-900">Contact & record</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-xs font-semibold text-slate-400">Email</dt><dd className="font-semibold">{d.student.email}</dd></div>
              <div className="flex justify-between"><dt className="text-xs font-semibold text-slate-400">Phone</dt><dd className="font-semibold">{d.student.phone ?? '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-xs font-semibold text-slate-400">Last login</dt><dd className="font-semibold">{d.student.lastLogin ? fmtDateTime(d.student.lastLogin) : 'never'}</dd></div>
            </dl>
          </div>
          <div className="card p-5">
            <h3 className="mb-3 text-sm font-extrabold text-slate-900">Cafe-wise spending</h3>
            {d.byCafe.length === 0 ? <p className="text-xs text-slate-400">No data yet.</p> : (
              <div className="space-y-2">
                {d.byCafe.map((c) => (
                  <div key={c.code} className="flex items-center justify-between rounded-xl bg-pu-50/60 px-3 py-2">
                    <span className="text-xs font-bold text-slate-700">{c.coverEmoji} {c.name}</span>
                    <span className="text-sm font-black">{inr(c.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { requireAdminPage } from '@/cafe/lib/rbac';
import { adminPayments } from '@/cafe/server/admin/payments';
import { inr } from '@/cafe/lib/money';
import { fmtDateTime } from '@/cafe/lib/dates';
import { EmptyState, Badge } from '@/cafe/components/ui';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Admin · Payments' };

export const dynamic = 'force-dynamic';

export default async function AdminPaymentsPage() {
  const admin = await requireAdminPage();
  const d = await adminPayments(admin, new URLSearchParams());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Payments & Cash Reconciliation</h1>
        <p className="mt-1 text-sm text-slate-500">
          Today only. Expected cash = valid (non-cancelled) orders · Received = PAID · Pending = difference.
        </p>
      </div>

      <section className="grid gap-3 md:grid-cols-3" aria-label="Cash reconciliation">
        {d.perCafe.map((c) => (
          <div key={c.id} className="card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold text-slate-900">{c.coverEmoji} {c.name}</span>
              <Badge tone="gray">{c.scope}</Badge>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Expected cash</dt><dd className="font-black">{inr(c.recon.expectedCash)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Cash received</dt><dd className="font-bold text-emerald-600">{inr(c.recon.collectedCash)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Pending cash</dt><dd className={`font-bold ${c.recon.pendingCash > 0 ? 'text-rose-600' : ''}`}>{inr(c.recon.pendingCash)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Valid orders</dt><dd className="font-semibold">{c.recon.validOrders}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Cancelled</dt><dd className="font-semibold text-slate-400">{c.recon.cancelledOrders}</dd></div>
            </dl>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-base font-extrabold text-slate-900">Recent cash receipts</h2>
        {d.payments.length === 0 ? (
          <EmptyState emoji="💵" title="No payments recorded yet" sub="Receipts appear here the moment staff confirm cash." />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Cafe</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Received At</th>
                </tr>
              </thead>
              <tbody>
                {d.payments.slice(0, 50).map((p) => (
                  <tr key={p.id} className="border-b border-slate-50">
                    <td className="px-4 py-2.5 font-mono text-xs font-bold">{p.orderNumber}</td>
                    <td className="px-4 py-2.5 text-xs font-semibold">{p.cafe.name}</td>
                    <td className="px-4 py-2.5 text-xs">
                      <span className="font-bold">{p.student.name}</span>{' '}
                      <span className="font-mono text-[10px] text-slate-400">{p.student.studentCode}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-black">{inr(p.amount)}</td>
                    <td className="px-4 py-2.5"><Badge tone="green">{p.method}</Badge></td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{fmtDateTime(p.receivedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

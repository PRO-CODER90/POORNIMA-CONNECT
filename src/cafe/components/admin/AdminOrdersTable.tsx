'use client';

import { useMemo, useState } from 'react';
import { inr } from '@/cafe/lib/money';
import { fmtDateTime } from '@/cafe/lib/dates';
import { OrderStatusBadge, PaymentBadge } from '@/cafe/components/status';
import { EmptyState, ErrorNote, Modal, Skeleton } from '@/cafe/components/ui';
import { usePolling } from '@/cafe/hooks/usePolling';

export interface AdminOrderRow {
  id: string;
  orderNumber: string;
  cafe: { id: string; code: string; name: string };
  student: { name: string; studentCode: string } | null;
  items: { id: string; name: string; emoji: string; quantity: number; unitPrice: number; subtotal: number }[];
  totalAmount: number;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
}

export interface CafeOption {
  id: string;
  code: string;
  name: string;
}

export default function AdminOrdersTable({ cafes }: { cafes: CafeOption[] }) {
  const [cafe, setCafe] = useState('');
  const [student, setStudent] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [payment, setPayment] = useState('');
  const [status, setStatus] = useState('');
  const [item, setItem] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [applied, setApplied] = useState({ cafe: '', student: '', from: '', to: '', payment: '', status: '', item: '' });

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (applied.cafe) p.set('cafe', applied.cafe);
    if (applied.student) p.set('student', applied.student);
    if (applied.from) p.set('from', applied.from);
    if (applied.to) p.set('to', applied.to);
    if (applied.payment) p.set('payment', applied.payment);
    if (applied.status) p.set('status', applied.status);
    if (applied.item) p.set('item', applied.item);
    return p.toString();
  }, [applied]);

  const { data, error, loading, reload } = usePolling(
    async () => {
      const r = await fetch(`/api/admin/orders?${qs}`);
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load orders');
      return (await r.json()) as { total: number; orders: AdminOrderRow[] };
    },
    15000,
  );

  const { detail } = usePollingDetail(detailId);

  return (
    <div>
      {/* filters */}
      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label" htmlFor="f-cafe">Cafe</label>
          <select id="f-cafe" className="input" value={cafe} onChange={(e) => setCafe(e.target.value)}>
            <option value="">All cafes</option>
            {cafes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-student">Student</label>
          <input id="f-student" className="input" placeholder="Name or Student ID" value={student} onChange={(e) => setStudent(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="f-from">From</label>
            <input id="f-from" type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="f-to">To</label>
            <input id="f-to" type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="f-item">Item</label>
          <input id="f-item" className="input" placeholder="e.g. Samosa" value={item} onChange={(e) => setItem(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="f-payment">Payment</label>
          <select id="f-payment" className="input" value={payment} onChange={(e) => setPayment(e.target.value)}>
            <option value="">Any</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-status">Order status</label>
          <select id="f-status" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Any</option>
            {['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button onClick={() => setApplied({ cafe, student, from, to, payment, status, item })} className="btn-primary flex-1">Apply filters</button>
          <button
            onClick={() => {
              setCafe(''); setStudent(''); setFrom(''); setTo(''); setPayment(''); setStatus(''); setItem('');
              setApplied({ cafe: '', student: '', from: '', to: '', payment: '', status: '', item: '' });
            }}
            className="btn-secondary"
          >
            Clear
          </button>
        </div>
      </div>

      {data && <p className="mb-2 text-xs text-slate-400">{data.total} order{data.total === 1 ? '' : 's'} found (showing latest 100)</p>}

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="space-y-2 p-4">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : error ? (
          <div className="p-4"><ErrorNote message={error} /></div>
        ) : (data?.orders.length ?? 0) === 0 ? (
          <div className="p-4"><EmptyState emoji="🧾" title="No orders match your filters" /></div>
        ) : (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Date / Time</th>
                <th className="px-4 py-3">Cafe</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {(data?.orders ?? []).map((o) => (
                <tr key={o.id} className="border-b border-slate-50 hover:bg-pu-50/60">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800">{o.orderNumber}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDateTime(o.createdAt)}</td>
                  <td className="px-4 py-3 text-xs font-semibold">{o.cafe.name}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs font-bold text-slate-800">{o.student?.name}</div>
                    <div className="font-mono text-[10px] text-slate-400">{o.student?.studentCode}</div>
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-3 text-xs text-slate-500">{o.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}</td>
                  <td className="px-4 py-3 text-right font-black">{inr(o.totalAmount)}</td>
                  <td className="px-4 py-3"><PaymentBadge status={o.paymentStatus} /></td>
                  <td className="px-4 py-3"><OrderStatusBadge status={o.orderStatus} /></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setDetailId(o.id)} className="text-xs font-bold text-indigo-600 hover:underline">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* detail modal */}
      <Modal open={!!detailId} onClose={() => setDetailId(null)} title={detail ? detail.orderNumber : 'Order'} wide>
        {detail ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <PaymentBadge status={detail.paymentStatus} />
              <OrderStatusBadge status={detail.orderStatus} />
              <span className="text-xs text-slate-400">{detail.cafe.name} · {fmtDateTime(detail.createdAt)}</span>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-pu-50/60 px-3 py-2"><span className="text-xs text-slate-400">Student</span><div className="font-bold">{detail.student?.name}</div></div>
              <div className="rounded-xl bg-pu-50/60 px-3 py-2"><span className="text-xs text-slate-400">Student ID</span><div className="font-mono text-xs font-bold">{detail.student?.studentCode}</div></div>
              {detail.paidAt && (
                <>
                  <div className="rounded-xl bg-pu-50/60 px-3 py-2"><span className="text-xs text-slate-400">Cash received at</span><div className="font-bold">{fmtDateTime(detail.paidAt)}</div></div>
                  <div className="rounded-xl bg-pu-50/60 px-3 py-2"><span className="text-xs text-slate-400">Approved by</span><div className="font-bold">{detail.paidByStaff ?? '—'}</div></div>
                </>
              )}
            </div>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
              {detail.items.map((i) => (
                <div key={i.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                  <span className="text-xl" aria-hidden>{i.emoji}</span>
                  <div className="flex-1 font-semibold">{i.name}</div>
                  <div className="text-xs text-slate-400">{i.quantity} × {inr(i.unitPrice)}</div>
                  <div className="w-16 text-right font-bold">{inr(i.subtotal)}</div>
                </div>
              ))}
              <div className="flex justify-between px-3 py-2.5"><span className="font-bold text-slate-500">Total</span><span className="text-lg font-black">{inr(detail.totalAmount)}</span></div>
            </div>
            {detail.cancelReason && <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">Cancelled: {detail.cancelReason}</div>}
          </div>
        ) : (
          <Skeleton className="h-40" />
        )}
      </Modal>
    </div>
  );
}

function usePollingDetail(id: string | null) {
  const { data, loading } = usePolling(
    async () => {
      const r = await fetch(`/api/admin/orders/${id}`);
      if (!r.ok) throw new Error('Failed to load');
      return (await r.json()).order as AdminOrderRow & { paidAt: string | null; paidByStaff: string | null; cancelReason: string | null };
    },
    10000,
    !!id,
  );
  return { detail: data, loading };
}

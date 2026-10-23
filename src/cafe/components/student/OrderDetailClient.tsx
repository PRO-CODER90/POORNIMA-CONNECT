'use client';

import { useState } from 'react';
import { usePolling } from '@/cafe/hooks/usePolling';
import { OrderStatusBadge, PaymentBadge } from '@/cafe/components/status';
import { ErrorNote, Skeleton } from '@/cafe/components/ui';
import { inr } from '@/cafe/lib/money';
import { fmtDateTime, fmtTime } from '@/cafe/lib/dates';

export interface FullOrder {
  id: string;
  orderNumber: string;
  cafe: { id: string; code: string; name: string };
  student: { name: string; studentCode: string } | null;
  items: { id: string; name: string; emoji: string; quantity: number; unitPrice: number; subtotal: number }[];
  totalAmount: number;
  itemCount: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  cancelReason: string | null;
  createdAt: string;
  acceptedAt: string | null;
  preparingAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
  paidAt: string | null;
  paidByStaff: string | null;
}

function Timeline({ o }: { o: FullOrder }) {
  const steps = [
    { label: 'Order Placed', at: o.createdAt },
    { label: 'Accepted by Kitchen', at: o.acceptedAt },
    { label: 'Preparing Food', at: o.preparingAt },
    { label: 'Ready for Pickup', at: o.readyAt },
    { label: 'Order Completed', at: o.completedAt },
  ];

  return (
    <ol className="relative space-y-0">
      {steps.map((s, i) => {
        const done = !!s.at;
        return (
          <li key={s.label} className="relative flex gap-3.5 pb-6 last:pb-0">
            {i < steps.length - 1 && (
              <span
                className={`absolute left-[13px] top-6 h-full w-0.5 ${
                  done && steps[i + 1]?.at ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
                aria-hidden
              />
            )}
            <span
              className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                done
                  ? 'border border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm'
                  : 'border border-slate-200 bg-slate-100 text-slate-400'
              }`}
              aria-hidden
            >
              {done ? '✓' : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className={`text-xs font-semibold ${done ? 'text-navy' : 'text-slate-400'}`}>
                {s.label}
              </div>
              <div className="font-mono text-[11px] text-slate-400">
                {done && s.at ? fmtTime(s.at) : 'Pending'}
              </div>
            </div>
          </li>
        );
      })}

      {/* Cash payment step */}
      <li className="relative flex gap-3.5 pt-2 border-t border-slate-100">
        <span
          className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            o.paidAt
              ? 'border border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm'
              : 'border border-amber-300 bg-amber-50 text-amber-800'
          }`}
          aria-hidden
        >
          {o.paidAt ? '✓' : '₹'}
        </span>
        <div className="min-w-0 flex-1">
          <div className={`text-xs font-semibold ${o.paidAt ? 'text-navy' : 'text-amber-800'}`}>
            Cash Payment {o.paidAt ? 'Confirmed' : 'Pending'}
          </div>
          <div className="text-[11px] text-slate-500">
            {o.paidAt
              ? `${fmtTime(o.paidAt)} · Confirmed by ${o.paidByStaff ?? 'Cafe Staff'}`
              : 'Pay exact cash at counter upon pickup'}
          </div>
        </div>
      </li>
    </ol>
  );
}

export default function OrderDetailClient({ orderId }: { orderId: string }) {
  const { data, error, loading, reload } = usePolling<FullOrder>(async () => {
    const r = await fetch(`/api/orders/${orderId}`);
    if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load order');
    return (await r.json()).order as FullOrder;
  }, 4000);

  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const cancel = async () => {
    if (!data) return;
    const reason = window.prompt('Reason for cancellation (optional):');
    if (reason === null) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const r = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? 'Could not cancel order');
      reload();
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : 'Could not cancel order');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }
  if (error || !data) {
    return <ErrorNote message={error ?? 'Order record could not be retrieved.'} />;
  }
  const o = data;
  const canCancel = o.orderStatus === 'PLACED';

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Receipt summary (left 2 cols) */}
      <div className="space-y-4 lg:col-span-2">
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="font-mono text-base font-bold text-navy">{o.orderNumber}</div>
              <div className="mt-1 text-xs text-slate-500">
                {o.cafe.name} · Placed {fmtDateTime(o.createdAt)}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PaymentBadge status={o.paymentStatus} />
              <OrderStatusBadge status={o.orderStatus} />
            </div>
          </div>

          {o.orderStatus === 'CANCELLED' && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
              <span className="font-bold">Order Cancelled:</span> {o.cancelReason ?? 'No reason provided.'}
            </div>
          )}

          {/* Line items list */}
          <div className="mt-4 divide-y divide-slate-100">
            {o.items.map((i) => (
              <div key={i.id} className="flex items-center gap-3 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-[#F8F7F3] text-lg">
                  {i.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-navy">{i.name}</div>
                  <div className="font-mono text-[11px] text-slate-400">
                    {inr(i.unitPrice)} × {i.quantity}
                  </div>
                </div>
                <div className="font-mono text-xs font-bold text-navy">{inr(i.subtotal)}</div>
              </div>
            ))}

            <div className="flex items-baseline justify-between pt-4">
              <span className="text-xs font-semibold text-slate-700">Total Payable</span>
              <span className="font-mono text-lg font-bold text-navy">{inr(o.totalAmount)}</span>
            </div>
          </div>

          {/* Payment & metadata summary grid */}
          <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-[#F8F7F3] p-4 text-xs sm:grid-cols-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Method</div>
              <div className="mt-1 font-semibold text-navy">Cash at Counter</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Payment Status</div>
              <div className={`mt-1 font-semibold ${o.paymentStatus === 'PAID' ? 'text-emerald-700' : 'text-amber-800'}`}>
                {o.paymentStatus}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Items</div>
              <div className="mt-1 font-mono font-semibold text-navy">{o.itemCount}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Payment Stamped</div>
              <div className="mt-1 font-mono text-[11px] font-medium text-slate-700">
                {o.paidAt ? fmtTime(o.paidAt) : 'Pending Receipt'}
              </div>
            </div>
          </div>
        </div>

        {canCancel && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]">
            <div className="text-xs text-slate-500">
              Orders can only be cancelled while status is still <span className="font-semibold text-navy">PLACED</span>.
            </div>
            <button
              onClick={cancel}
              disabled={cancelling}
              className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-50"
            >
              {cancelling ? 'Cancelling Order…' : 'Cancel Order'}
            </button>
          </div>
        )}

        {cancelError && <ErrorNote message={cancelError} />}
      </div>

      {/* Timeline (right col) */}
      <div className="h-fit rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] sm:p-6">
        <h3 className="mb-4 text-sm font-bold text-navy">Order Progress Timeline</h3>
        <Timeline o={o} />
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { inr } from '@/cafe/lib/money';
import { timeAgo } from '@/cafe/lib/dates';
import { OrderStatusBadge, PaymentBadge } from '@/cafe/components/status';
import { EmptyState, ErrorNote, Skeleton } from '@/cafe/components/ui';
import { usePolling } from '@/cafe/hooks/usePolling';

export interface OrderLite {
  id: string;
  orderNumber: string;
  cafe: { id: string; code: string; name: string };
  items: { id: string; name: string; emoji: string; quantity: number; unitPrice: number; subtotal: number }[];
  totalAmount: number;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
}

const RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'all', label: 'All' },
] as const;

export default function OrdersList() {
  const [range, setRange] = useState('all');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const useCustom = custom.from || custom.to;
  const filter = useCustom ? `from=${custom.from}&to=${custom.to}` : range === 'all' ? '' : `range=${range}`;

  const { data, error, loading, reload } = usePolling<OrderLite[]>(
    async () => {
      const r = await fetch(`/api/orders/mine?${filter}`);
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load orders');
      return (await r.json()).orders as OrderLite[];
    },
    8000,
  );

  const hasActive = (data ?? []).some((o) => !['COMPLETED', 'CANCELLED'].includes(o.orderStatus));

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setCustom({ from: '', to: '' });
                setRange(r.id);
              }}
              className={`shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                range === r.id && !useCustom
                  ? 'bg-navy text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-navy'
              }`}
              aria-pressed={range === r.id && !useCustom}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <input
            type="date"
            value={custom.from}
            onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
            className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
            aria-label="Filter from date"
          />
          <span className="text-xs text-slate-400">→</span>
          <input
            type="date"
            value={custom.to}
            onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
            className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
            aria-label="Filter to date"
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {loading ? (
          <>
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </>
        ) : error ? (
          <ErrorNote message={error} />
        ) : (data ?? []).length === 0 ? (
          <EmptyState
            title="No orders found for this period"
            sub="Try selecting a different date range or visit campus cafes to place an order."
            action={
              <Link
                href="/student/cafes"
                className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-navy-700"
              >
                Browse Campus Cafes
              </Link>
            }
          />
        ) : (
          (data ?? []).map((o) => (
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
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {hasActive && (
        <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live kitchen polling active — order updates appear automatically</span>
        </div>
      )}
      <button onClick={reload} className="sr-only">
        Refresh orders
      </button>
    </div>
  );
}

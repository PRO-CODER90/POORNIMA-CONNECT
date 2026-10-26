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
  items: { id: string; name: string; imageUrl: string | null; quantity: number; unitPrice: number; subtotal: number }[];
  totalAmount: number;
  paymentStatus: string;
  paymentMethod?: string;
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
        <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-full border border-slate-200/80 bg-white p-1 shadow-sm" role="group" aria-label="Order date range">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setCustom({ from: '', to: '' });
                setRange(r.id);
              }}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pu-500 ${
                range === r.id && !useCustom ? 'bg-pu-600 text-white shadow-sm' : 'text-ink/70 hover:bg-pu-50 hover:text-pu-700'
              }`}
              aria-pressed={range === r.id && !useCustom}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-full border border-slate-200/80 bg-white px-4 py-2 shadow-sm">
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
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </>
        ) : error ? (
          <ErrorNote message={error} />
        ) : (data ?? []).length === 0 ? (
          <EmptyState
            surface
            title="No orders found for this period"
            sub="Try selecting a different date range or visit campus cafes to place an order."
            action={
              <Link href="/student/cafes" className="btn-solid-pu">
                Browse Campus Cafes
              </Link>
            }
          />
        ) : (
          (data ?? []).map((o) => (
            <Link
              key={o.id}
              href={`/student/orders/${o.id}`}
              className="surface group block p-4 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pu-500"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="w-full min-w-0 sm:w-auto sm:flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-pu-600">
                      {o.orderNumber}
                    </span>
                    <span className="text-xs text-slate-300" aria-hidden>·</span>
                    <span className="text-xs font-medium text-slate-700">{o.cafe.name}</span>
                    <span className="text-xs text-slate-300" aria-hidden>·</span>
                    <span className="text-xs text-muted">{timeAgo(o.createdAt)}</span>
                  </div>

                  <div className="mt-2 line-clamp-1 text-xs text-muted">
                    {o.items.map((i) => `${i.name} × ${i.quantity}`).join('  ·  ')}
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-sm font-bold text-ink">{inr(o.totalAmount)}</span>
                  <PaymentBadge status={o.paymentStatus} method={o.paymentMethod} />
                  <OrderStatusBadge status={o.orderStatus} />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {hasActive && (
        <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-muted">
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

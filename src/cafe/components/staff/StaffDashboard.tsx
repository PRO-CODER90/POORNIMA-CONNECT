'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Banknote, CheckCircle2, ChefHat, PackageCheck, Play, RefreshCw } from 'lucide-react';
import { usePolling } from '@/cafe/hooks/usePolling';
import { StatCard, EmptyState, ErrorNote, Modal, Spinner } from '@/cafe/components/ui';
import { OrderStatusBadge, PaymentBadge } from '@/cafe/components/status';
import { inr } from '@/cafe/lib/money';
import { fmtTime } from '@/cafe/lib/dates';
import { ProductThumb } from '@/cafe/components/ProductImage';

interface OrderRow {
  id: string;
  orderNumber: string;
  student: { name: string; studentCode: string } | null;
  items: { id: string; name: string; imageUrl: string | null; quantity: number; unitPrice: number; subtotal: number }[];
  totalAmount: number;
  itemCount: number;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  acceptedAt: string | null;
  preparingAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
  paidAt: string | null;
  paidByStaff: string | null;
  cancelReason: string | null;
}

interface Dash {
  cafe: { id: string; code: string; name: string };
  staff: { name: string; staffCode: string };
  stats: { newOrders: number; preparing: number; ready: number; completedToday: number; salesToday: number; collectedToday: number; pendingCash: number };
  newOrders: OrderRow[];
  preparing: OrderRow[];
  ready: OrderRow[];
  completedToday: OrderRow[];
  pendingPayment: OrderRow[];
}

type Tab = 'new' | 'preparing' | 'ready' | 'completed' | 'paypending';

export default function StaffDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('new');
  const [detail, setDetail] = useState<OrderRow | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [cashOrder, setCashOrder] = useState<OrderRow | null>(null);
  const [confirmingCash, setConfirmingCash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, error: fetchError, reload } = usePolling<Dash>(async () => {
    const r = await fetch('/api/staff/dashboard');
    if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load dashboard');
    return (await r.json()) as Dash;
  }, 4000);

  const act = async (orderId: string, action: string) => {
    setBusyAction(action);
    setError(null);
    try {
      const r = await fetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Action failed');
      setDetail((prev) => (prev && prev.id === orderId ? ({ ...prev, ...d.order } as OrderRow) : prev));
      reload();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusyAction(null);
    }
  };

  const confirmCash = async () => {
    if (!cashOrder) return;
    setConfirmingCash(true);
    setError(null);
    try {
      const r = await fetch(`/api/orders/${cashOrder.id}/payment`, { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Could not record payment');
      setCashOrder(null);
      setDetail((prev) => (prev && prev.id === cashOrder.id ? ({ ...prev, ...d.order } as OrderRow) : prev));
      reload();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not record payment');
    } finally {
      setConfirmingCash(false);
    }
  };

  const list = useMemo<OrderRow[]>(() => {
    if (!data) return [];
    switch (tab) {
      case 'new': return data.newOrders;
      case 'preparing': return [...data.newOrders.filter((o) => o.orderStatus === 'ACCEPTED'), ...data.preparing];
      case 'ready': return data.ready;
      case 'completed': return data.completedToday;
      case 'paypending': return data.pendingPayment;
    }
  }, [data, tab]);

  if (fetchError) {
    return <ErrorNote message={fetchError} />;
  }
  if (!data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-20" />
          ))}
        </div>
        <div className="skeleton h-64" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'new', label: 'NEW', count: data.stats.newOrders },
    { id: 'preparing', label: 'PREPARING', count: data.stats.preparing + data.newOrders.filter((o) => o.orderStatus === 'ACCEPTED').length },
    { id: 'ready', label: 'READY', count: data.stats.ready },
    { id: 'completed', label: 'COMPLETED', count: data.stats.completedToday },
    { id: 'paypending', label: 'PAYMENT PENDING', count: data.stats.pendingCash > 0 ? data.pendingPayment.length : 0 },
  ];

  const detailOrder = detail;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-black text-slate-900">
            {data.staff.name} <span className="font-semibold text-slate-400">·</span> {data.cafe.name}
          </h1>
          <p className="text-xs text-slate-500">Only orders from your assigned cafe appear here.</p>
        </div>
        <button onClick={() => { reload(); router.refresh(); }} className="btn-secondary !px-3 !py-2 text-xs" aria-label="Refresh">
          <RefreshCw size={14} aria-hidden /> Refresh
        </button>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-6" aria-label="Today's stats">
        <StatCard label="New Orders" value={data.stats.newOrders} icon={<Bell size={18} />} tone={data.stats.newOrders > 0 ? 'brand' : 'default'} />
        <StatCard label="Preparing" value={data.stats.preparing} icon={<ChefHat size={18} />} />
        <StatCard label="Ready" value={data.stats.ready} icon={<PackageCheck size={18} />} tone="green" />
        <StatCard label="Completed Today" value={data.stats.completedToday} icon={<CheckCircle2 size={18} />} />
        <StatCard label="Today's Sales" value={inr(data.stats.salesToday)} sub={`collected ${inr(data.stats.collectedToday)}`} icon="💰" tone="green" />
        <StatCard label="Pending Cash" value={inr(data.stats.pendingCash)} icon={<Banknote size={18} />} tone={data.stats.pendingCash > 0 ? 'red' : 'default'} />
      </section>

      {error && <ErrorNote message={error} />}

      {/* tabs */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-black tracking-wide ${
              tab === t.id ? 'bg-pu-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
            aria-pressed={tab === t.id}
          >
            {t.label}
            <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${tab === t.id ? 'bg-white/20' : 'bg-slate-100'}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* order list */}
      <div className="space-y-3">
        {list.length === 0 ? (
          <EmptyState
            emoji={tab === 'new' ? '🔔' : '✅'}
            title={
              tab === 'new' ? 'No orders pending' : tab === 'paypending' ? 'No pending cash' : tab === 'ready' ? 'Nothing ready right now' : 'No orders in this view'
            }
            sub={tab === 'new' ? 'New orders will appear here instantly as students place them.' : undefined}
          />
        ) : (
          list.map((o) => (
            <button key={o.id} onClick={() => { setDetail(o); setError(null); }} className="card block w-full p-4 text-left transition-shadow hover:shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <ProductThumb src={o.items[0]?.imageUrl} name={o.items[0]?.name ?? 'Order'} className="h-11 w-11 rounded-xl" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-black text-slate-900">{o.orderNumber}</span>
                      <OrderStatusBadge status={o.orderStatus} />
                      <PaymentBadge status={o.paymentStatus} />
                    </div>
                    <div className="mt-0.5 truncate text-xs text-slate-500">
                      {o.student?.name} · <span className="font-mono">{o.student?.studentCode}</span> · {fmtTime(o.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-black text-slate-900">{inr(o.totalAmount)}</div>
                  <div className="text-[10px] text-slate-400">{o.itemCount} item{o.itemCount === 1 ? '' : 's'} · CASH</div>
                </div>
              </div>
              <div className="mt-2 truncate text-xs text-slate-500">{o.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')}</div>
            </button>
          ))
        )}
      </div>

      {/* order detail modal */}
      <Modal open={!!detailOrder} onClose={() => setDetail(null)} title="Order Details" wide>
        {detailOrder && <OrderActions order={detailOrder} onAction={act} onCash={() => { setCashOrder(detailOrder); setDetail(null); }} busyAction={busyAction} />}
      </Modal>

      {/* cash confirmation modal */}
      <Modal open={!!cashOrder} onClose={() => !confirmingCash && setCashOrder(null)} title="Confirm cash receipt">
        {cashOrder && (
          <div>
            <div className="rounded-2xl bg-pu-50/60 p-4 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Order</span><span className="font-mono text-xs font-bold">{cashOrder.orderNumber}</span></div>
              <div className="mt-1 flex justify-between"><span className="text-slate-500">Student</span><span className="font-semibold">{cashOrder.student?.name} ({cashOrder.student?.studentCode})</span></div>
              <div className="mt-1 flex justify-between"><span className="text-slate-500">Amount</span><span className="text-lg font-black text-slate-900">{inr(cashOrder.totalAmount)}</span></div>
            </div>
            <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-relaxed text-emerald-800">
              Confirm that {inr(cashOrder.totalAmount)} cash has been received from this student?
            </p>
            {error && <div className="mt-3"><ErrorNote message={error} /></div>}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button onClick={() => setCashOrder(null)} className="btn-secondary" disabled={confirmingCash}>CANCEL</button>
              <button onClick={confirmCash} className="btn-success" disabled={confirmingCash}>
                {confirmingCash ? (<><Spinner /> Confirming…</>) : 'CONFIRM — MARK PAID'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function OrderActions({
  order,
  onAction,
  onCash,
  busyAction,
}: {
  order: OrderRow;
  onAction: (id: string, action: string) => void;
  onCash: () => void;
  busyAction: string | null;
}) {
  const s = order.orderStatus;
  const next: { action: string; label: string; icon: React.ReactNode } | null =
    s === 'PLACED' ? { action: 'accept', label: 'ACCEPT ORDER', icon: <Play size={16} /> }
    : s === 'ACCEPTED' ? { action: 'preparing', label: 'START PREPARING', icon: <ChefHat size={16} /> }
    : s === 'PREPARING' ? { action: 'ready', label: 'MARK READY', icon: <Bell size={16} /> }
    : s === 'READY' ? { action: 'completed', label: 'MARK COMPLETED', icon: <CheckCircle2 size={16} /> }
    : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-sm font-black">{order.orderNumber}</span>
        <div className="flex gap-2">
          <PaymentBadge status={order.paymentStatus} />
          <OrderStatusBadge status={s} />
        </div>
      </div>
      <div className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
        <div className="rounded-xl bg-pu-50/60 px-3 py-2"><span className="text-xs text-slate-400">Student</span><div className="font-bold">{order.student?.name}</div></div>
        <div className="rounded-xl bg-pu-50/60 px-3 py-2"><span className="text-xs text-slate-400">Student ID</span><div className="font-mono text-xs font-bold">{order.student?.studentCode}</div></div>
        <div className="rounded-xl bg-pu-50/60 px-3 py-2"><span className="text-xs text-slate-400">Order time</span><div className="font-bold">{fmtTime(order.createdAt)}</div></div>
        <div className="rounded-xl bg-pu-50/60 px-3 py-2"><span className="text-xs text-slate-400">Payment method</span><div className="font-bold">💵 CASH</div></div>
      </div>

      <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100">
        {order.items.map((i) => (
          <div key={i.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
            <ProductThumb src={i.imageUrl} name={i.name} className="h-9 w-9" />
            <div className="flex-1 font-semibold text-slate-800">{i.name}</div>
            <div className="text-xs text-slate-400">{i.quantity} × {inr(i.unitPrice)}</div>
            <div className="w-16 text-right font-bold">{inr(i.subtotal)}</div>
          </div>
        ))}
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-sm font-bold text-slate-500">Total</span>
          <span className="text-lg font-black">{inr(order.totalAmount)}</span>
        </div>
      </div>

      {order.cancelReason && (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
          Cancelled: {order.cancelReason}
        </div>
      )}

      {order.paidAt && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          🟢 Cash received {fmtTime(order.paidAt)} · confirmed by {order.paidByStaff ?? 'staff'}
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {next ? (
          <button
            onClick={() => onAction(order.id, next.action)}
            disabled={busyAction !== null}
            className={`btn-lg w-full ${s === 'READY' ? 'btn-success' : 'btn-primary'}`}
          >
            {busyAction === next.action ? <Spinner /> : next.icon} {next.label}
          </button>
        ) : (
          <div className="flex items-center justify-center rounded-xl bg-pu-50/60 px-4 py-3 text-xs font-bold text-slate-400">
            {s === 'COMPLETED' ? '✓ Order completed' : 'No further actions'}
          </div>
        )}
        {order.paymentStatus === 'PENDING' && s !== 'CANCELLED' ? (
          <button onClick={onCash} className="btn-success btn-lg w-full">
            <Banknote size={16} aria-hidden /> MARK CASH RECEIVED
          </button>
        ) : (
          <div className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-600">
            🟢 PAYMENT {order.paymentStatus}
          </div>
        )}
      </div>
    </div>
  );
}

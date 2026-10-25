'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Minus, Plus, Trash2, X, ShoppingCart, Banknote, Store } from 'lucide-react';
import { useCart } from './CartContext';
import { Spinner, ErrorNote, EmptyState } from '@/cafe/components/ui';
import { inr } from '@/cafe/lib/money';
import type { OrderDto } from '@/cafe/server/orders';
import { ProductThumb } from '@/cafe/components/ProductImage';

export default function CartDrawer() {
  const cart = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<OrderDto | null>(null);
  const { drawerOpen, refreshStock } = cart;

  // Re-check stock whenever the drawer opens: the saved cart is never trusted for quantities.
  useEffect(() => {
    if (drawerOpen) refreshStock();
  }, [drawerOpen, refreshStock]);

  const soldOut = (id: string) => cart.stock[id]?.available === false;
  const blocked = cart.items.some((i) => soldOut(i.menuItemId));

  const placeOrder = async () => {
    if (busy || cart.items.length === 0 || blocked) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // NOTE: we send item ids + quantities ONLY. The total is always
        // recomputed server-side from database prices (spec §66).
        body: JSON.stringify({ items: cart.items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })) }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error ?? 'Could not place your order. Please try again.');
        refreshStock(); // e.g. "Only 2 left of Potato Chips." — fetch the new numbers and clamp the cart
        return;
      }
      setPlaced(data.order as OrderDto);
      cart.clear();
    } catch {
      setError('Network error. Your order was not placed — please retry.');
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    cart.setDrawerOpen(false);
    setPlaced(null);
    setError(null);
  };

  return (
    <div className={`fixed inset-0 z-50 ${cart.drawerOpen ? '' : 'pointer-events-none'}`} aria-hidden={!cart.drawerOpen}>
      <div
        className={`absolute inset-0 bg-pu-900/50 backdrop-blur-sm transition-opacity duration-300 ${
          cart.drawerOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={cart.drawerOpen ? close : undefined}
        aria-hidden
      />
      <div
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${
          cart.drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-label="Campus dining cart"
      >
        {placed ? (
          // ── ORDER CONFIRMATION ──
          <div className="flex flex-1 flex-col items-center overflow-y-auto p-6 text-center">
            <div className="mt-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-sm">
              <span className="text-2xl font-bold">✓</span>
            </div>
            <h2 className="mt-3 text-lg font-bold text-ink">Order Placed Successfully</h2>
            <p className="mt-1 text-xs text-muted">
              Your order has been queued in the cafe kitchen.
            </p>

            <div className="mt-5 w-full space-y-2.5 rounded-xl border border-slate-200/90 bg-pu-50/40 p-4 text-left text-xs">
              <Row k="Order Number" v={<span className="font-mono text-xs font-semibold text-ink">{placed.orderNumber}</span>} />
              <Row k="Campus Cafe" v={<span className="font-medium text-slate-800">{placed.cafe.name}</span>} />

              <div className="border-t border-slate-200/60 pt-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Items Ordered</div>
                <div className="mt-1.5 space-y-1">
                  {placed.items.map((i) => (
                    <div key={i.id} className="flex justify-between text-slate-700">
                      <span>
                        {i.name} <span className="font-mono text-slate-400">× {i.quantity}</span>
                      </span>
                      <span className="font-mono font-medium text-slate-900">{inr(i.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200/60 pt-2">
                <Row k="Total Amount" v={<span className="font-mono text-sm font-bold text-ink">{inr(placed.totalAmount)}</span>} />
              </div>
              <Row k="Payment Method" v="CASH at the counter" />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-medium text-muted">Payment Status</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  CASH PENDING
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted">Order Status</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-600" />
                  PLACED
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-left text-xs text-amber-900">
              <Banknote size={16} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
              <div>
                <span className="font-semibold text-ink">Payment Instructions: </span>
                Please pay <span className="font-mono font-bold">{inr(placed.totalAmount)}</span> in cash directly to the cafe staff at the counter.
              </div>
            </div>

            <Link
              href={`/student/orders/${placed.id}`}
              className="btn-solid-pu mt-5 w-full py-2.5"
              onClick={close}
            >
              Track Order Progress
            </Link>
            <button
              onClick={close}
              className="mt-2.5 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pu-600 text-white">
                  <ShoppingCart size={14} aria-hidden />
                </div>
                <h2 className="text-sm font-bold text-ink">Your Cart</h2>
                {cart.items.length > 0 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {cart.count} items
                  </span>
                )}
              </div>
              <button
                onClick={close}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-pu-600 transition-colors"
                aria-label="Close cart drawer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Cart Items Area */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {cart.items.length === 0 ? (
                <EmptyState
                  icon={<ShoppingCart size={24} />}
                  title="Your cart is currently empty"
                  sub="Explore any campus cafe menu to select items for cash ordering."
                />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-ink">
                    <Store size={14} className="text-pu-600" aria-hidden />
                    <span className="truncate">{cart.items[0].cafeName}</span>
                  </div>

                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/90 bg-white">
                    {cart.items.map((i) => (
                      <div key={i.menuItemId} className={`flex items-center gap-3 p-3 ${soldOut(i.menuItemId) ? 'bg-rose-50/60' : ''}`}>
                        <ProductThumb src={i.imageUrl} name={i.name} />

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-semibold text-ink">{i.name}</div>
                          {soldOut(i.menuItemId) ? (
                            <div className="text-[11px] font-semibold text-rose-700">No longer available — remove it to order</div>
                          ) : (
                            <div className="font-mono text-[11px] text-slate-400">
                              {inr(i.price)} × {i.quantity}
                              {i.quantity >= cart.maxFor(i.menuItemId) && cart.maxFor(i.menuItemId) < 99 ? (
                                <span className="ml-1.5 font-sans font-semibold text-amber-700">Only {cart.maxFor(i.menuItemId)} available</span>
                              ) : null}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => cart.setQty(i.menuItemId, i.quantity - 1)}
                            className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                            aria-label={`Decrease ${i.name}`}
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-5 text-center font-mono text-xs font-semibold text-ink">
                            {i.quantity}
                          </span>
                          <button
                            onClick={() => cart.setQty(i.menuItemId, i.quantity + 1)}
                            disabled={i.quantity >= cart.maxFor(i.menuItemId)}
                            className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40"
                            aria-label={`Increase ${i.name}`}
                          >
                            <Plus size={12} />
                          </button>
                          <button
                            onClick={() => cart.removeItem(i.menuItemId)}
                            className="ml-1 rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            aria-label={`Remove ${i.name}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <div className="w-16 text-right font-mono text-xs font-bold text-ink">
                          {inr(i.price * i.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Cart Summary & Checkout */}
            {cart.items.length > 0 && (
              <div className="space-y-3.5 border-t border-slate-100 bg-white px-5 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
                <div className="flex justify-between text-xs text-muted">
                  <span>Subtotal</span>
                  <span className="font-mono font-medium text-slate-700">{inr(cart.subtotal)}</span>
                </div>
                <div className="flex items-baseline justify-between border-t border-slate-100 pt-2">
                  <span className="text-xs font-semibold text-ink">Total Payable</span>
                  <span className="font-mono text-lg font-bold text-ink">{inr(cart.subtotal)}</span>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                  <Banknote size={15} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
                  <div className="leading-relaxed">
                    <span className="font-semibold text-ink">Cash Only: </span>
                    Present order number and pay exact cash at counter upon confirmation.
                  </div>
                </div>

                {error && <ErrorNote message={error} />}

                <button
                  onClick={placeOrder}
                  disabled={busy || cart.items.length === 0 || blocked}
                  className="btn-solid-pu w-full py-3 uppercase tracking-wider"
                >
                  {busy ? (
                    <>
                      <Spinner className="h-3.5 w-3.5" />
                      <span>Placing Order…</span>
                    </>
                  ) : (
                    'Place Order (Cash on Counter)'
                  )}
                </button>

                <p className="text-center text-[10px] text-slate-400">
                  Campus cash reconciliation system · Verified server rates
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-medium text-muted">{k}</span>
      <span className="text-xs font-medium text-slate-800">{v}</span>
    </div>
  );
}

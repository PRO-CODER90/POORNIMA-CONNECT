'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plus, Minus } from 'lucide-react';
import { useCart, type StockMap } from '@/cafe/components/cart/CartContext';
import { Modal, EmptyState, Badge } from '@/cafe/components/ui';
import ProductImage from '@/cafe/components/ProductImage';
import { usePolling } from '@/cafe/hooks/usePolling';
import { inr } from '@/cafe/lib/money';
import type { MenuItemDto } from '@/cafe/lib/liveStock';

export interface MenuCafe {
  id: string;
  code: string;
  name: string;
  status: 'OPEN' | 'CLOSED';
  categories: { id: string; name: string; sortOrder: number }[];
  items: MenuItemDto[];
}

type Item = MenuItemDto;

export default function MenuBrowser({ cafe }: { cafe: MenuCafe }) {
  const cart = useCart();
  const [query, setQuery] = useState('');
  const [catId, setCatId] = useState<string>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [flash, setFlash] = useState<Set<string>>(new Set());

  // ── live stock: poll every 4 s; the server answers 304 when nothing changed ──
  const etag = useRef<string | null>(null);
  const last = useRef<StockMap>(Object.fromEntries(cafe.items.map((i) => [i.id, i.stock])));
  const fetchStock = useCallback(async (): Promise<StockMap> => {
    const r = await fetch(`/api/cafes/${cafe.id}/stock`, {
      cache: 'no-store',
      headers: etag.current ? { 'If-None-Match': etag.current } : {},
    });
    if (r.status === 304) return last.current;
    if (!r.ok) throw new Error('Could not refresh stock.');
    etag.current = r.headers.get('etag');
    const d = (await r.json()) as { items: StockMap };
    return d.items;
  }, [cafe.id]);
  const { data: polled, reload } = usePolling(fetchStock, 4000);
  const stock = polled ?? last.current;

  const { applyStock, setStockRefresher } = cart;
  useEffect(() => {
    if (!polled || polled === last.current) return;
    const changed = Object.keys(polled).filter((id) => last.current[id]?.qty !== polled[id].qty);
    last.current = polled;
    applyStock(polled);
    if (changed.length) {
      setFlash(new Set(changed));
      const t = setTimeout(() => setFlash(new Set()), 1000);
      return () => clearTimeout(t);
    }
  }, [polled, applyStock]);
  const reloadRef = useRef(reload);
  useEffect(() => {
    reloadRef.current = reload;
  });
  useEffect(() => {
    applyStock(last.current);
    setStockRefresher(() => reloadRef.current());
    return () => setStockRefresher(null);
  }, [applyStock, setStockRefresher]);

  const live = useCallback((i: Item) => stock[i.id] ?? i.stock, [stock]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cafe.items.filter((i) => {
      if (catId !== 'ALL' && i.categoryId !== catId) return false;
      if (q && !i.name.toLowerCase().includes(q) && !i.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [cafe.items, query, catId]);

  const catName = (id: string) => cafe.categories.find((c) => c.id === id)?.name ?? '';
  const isOpen = cafe.status === 'OPEN';
  const selected = cafe.items.find((i) => i.id === selectedId) ?? null;

  const inCart = (id: string) => cart.items.find((c) => c.menuItemId === id)?.quantity ?? 0;
  const roomFor = (i: Item) => Math.max(0, cart.maxFor(i.id) - inCart(i.id));

  const doAdd = (item: Item, quantity: number) => {
    if (!live(item).available || !isOpen || roomFor(item) <= 0) return;
    cart.addItem({ menuItemId: item.id, name: item.name, price: item.price, imageUrl: item.imageUrl, cafeId: cafe.id, cafeName: cafe.name }, quantity);
    cart.setDrawerOpen(true);
    cart.refreshStock();
  };

  const open = (i: Item) => {
    setSelectedId(i.id);
    setQty(1);
  };

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          className="input-pu pl-10 shadow-sm"
          placeholder="Search items by name or description..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search cafe menu"
        />
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        <Chip active={catId === 'ALL'} onClick={() => setCatId('ALL')}>
          All Items
        </Chip>
        {cafe.categories.map((c) => (
          <Chip key={c.id} active={catId === c.id} onClick={() => setCatId(c.id)}>
            {c.name}
          </Chip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyState icon={<Search size={24} />} title="No matching items found" sub="Try adjusting your search terms or selecting a different category filter." />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item, idx) => {
            const s = live(item);
            const soldOut = !s.available;
            return (
              <article key={item.id} className="surface group flex flex-col overflow-hidden transition-shadow hover:shadow-md">
                <button
                  type="button"
                  onClick={() => open(item)}
                  className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pu-500"
                  aria-label={`View ${item.name}`}
                >
                  <ProductImage src={item.imageUrl} name={item.name} itemType={item.itemType} dimmed={soldOut} priority={idx < 4} />
                  <span className="absolute left-2.5 top-2.5 rounded border border-slate-200/80 bg-white/95 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-muted shadow-sm backdrop-blur">
                    {catName(item.categoryId)}
                  </span>
                  <VegDot veg={item.isVeg} className="absolute right-2.5 top-2.5" />
                  {soldOut && (
                    <span className="absolute inset-x-0 bottom-0 bg-rose-600/90 py-1 text-center text-[11px] font-bold uppercase tracking-wider text-white">
                      {s.state === 'OUT' ? 'Out of stock' : 'Unavailable'}
                    </span>
                  )}
                </button>

                <div className="flex flex-1 flex-col p-4">
                  <button onClick={() => open(item)} className="line-clamp-1 text-left text-sm font-semibold text-ink transition-colors hover:text-pu-600">
                    {item.name}
                  </button>
                  {item.packSize ? <p className="mt-0.5 text-[11px] font-medium text-slate-500">{item.packSize}</p> : null}
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{item.description}</p>

                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3.5">
                    <div className="min-w-0">
                      <span className="font-mono text-sm font-bold text-ink">{inr(item.price)}</span>
                      <StockLabel s={s} flash={flash.has(item.id)} />
                    </div>
                    <button
                      onClick={() => doAdd(item, 1)}
                      disabled={soldOut || !isOpen || roomFor(item) <= 0}
                      className="btn-solid-pu shrink-0 px-3 py-1.5"
                      aria-label={`Add ${item.name} to cart`}
                    >
                      <Plus size={13} aria-hidden />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelectedId(null)} title="Item Details">
        {selected &&
          (() => {
            const s = live(selected);
            const room = roomFor(selected);
            const max = Math.max(1, Math.min(99, room));
            const q = Math.min(qty, max);
            return (
              <div className="space-y-4">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100">
                  <ProductImage src={selected.imageUrl} name={selected.name} itemType={selected.itemType} size="hero" dimmed={!s.available} />
                </div>

                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-base font-bold text-ink">
                      <VegDot veg={selected.isVeg} />
                      {selected.name}
                    </h3>
                    <span className="font-mono text-lg font-bold text-ink">{inr(selected.price)}</span>
                  </div>
                  {selected.packSize ? <p className="mt-0.5 text-xs font-medium text-slate-500">{selected.packSize}</p> : null}
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">{selected.description}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge tone="gray">{catName(selected.categoryId)}</Badge>
                  {s.available ? <Badge tone="green">AVAILABLE</Badge> : <Badge tone="red">{s.state === 'OUT' ? 'OUT OF STOCK' : 'UNAVAILABLE'}</Badge>}
                  <StockLabel s={s} flash={flash.has(selected.id)} />
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-xs font-semibold text-slate-600">Quantity</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQty(Math.max(1, q - 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center font-mono text-sm font-bold text-ink">{q}</span>
                    <button
                      onClick={() => setQty(Math.min(max, q + 1))}
                      disabled={q >= max}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      aria-label="Increase quantity"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                {s.qty !== null && s.available && q >= max ? (
                  <p className="text-right text-[11px] font-medium text-amber-700">
                    {room > 0 ? `Only ${s.qty} available` : 'All remaining stock is already in your cart'}
                  </p>
                ) : null}

                <button
                  onClick={() => {
                    doAdd(selected, q);
                    setSelectedId(null);
                  }}
                  disabled={!s.available || !isOpen || room <= 0}
                  className="btn-solid-pu mt-3 w-full py-2.5"
                >
                  {!isOpen ? 'Cafe is closed' : !s.available ? 'Currently unavailable' : room <= 0 ? 'Limit reached' : `ADD TO CART — ${inr(selected.price * q)}`}
                </button>
              </div>
            );
          })()}
      </Modal>
    </div>
  );
}

function StockLabel({ s, flash }: { s: { state: string; qty: number | null }; flash: boolean }) {
  if (s.qty === null || s.state === 'OUT' || s.state === 'EXPIRED') return null;
  const low = s.state === 'LOW';
  return (
    <span
      className={`ml-2 rounded px-1 text-[11px] font-semibold transition-shadow ${low ? 'text-amber-700' : 'text-slate-500'} ${
        flash ? 'ring-2 ring-pu-200' : ''
      }`}
      aria-live="polite"
    >
      {low ? `Only ${s.qty} left` : `${s.qty} left`}
    </span>
  );
}

function VegDot({ veg, className = '' }: { veg: boolean; className?: string }) {
  return (
    <span
      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-2 bg-white ${veg ? 'border-emerald-600' : 'border-rose-700'} ${className}`}
      title={veg ? 'Vegetarian' : 'Non-vegetarian'}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${veg ? 'bg-emerald-600' : 'bg-rose-700'}`} aria-hidden />
      <span className="sr-only">{veg ? 'Vegetarian' : 'Non-vegetarian'}</span>
    </span>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pu-500 ${
        active ? 'bg-pu-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-ink/70 hover:bg-pu-50 hover:text-pu-700'
      }`}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

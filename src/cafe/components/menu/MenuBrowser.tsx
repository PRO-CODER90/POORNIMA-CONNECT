'use client';

import { useMemo, useState } from 'react';
import { Search, Plus, Minus } from 'lucide-react';
import { useCart } from '@/cafe/components/cart/CartContext';
import { Modal, EmptyState, Badge } from '@/cafe/components/ui';
import { inr } from '@/cafe/lib/money';

export interface MenuCafe {
  id: string;
  code: string;
  name: string;
  description: string;
  location: string;
  coverEmoji: string;
  openingTime: string;
  closingTime: string;
  status: 'OPEN' | 'CLOSED';
  categories: { id: string; name: string; sortOrder: number }[];
  items: { id: string; name: string; description: string; price: number; emoji: string; categoryId: string; isAvailable: boolean }[];
}

export default function MenuBrowser({ cafe }: { cafe: MenuCafe }) {
  const cart = useCart();
  const [query, setQuery] = useState('');
  const [catId, setCatId] = useState<string>('ALL');
  const [selected, setSelected] = useState<MenuCafe['items'][number] | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

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

  const doAdd = (item: MenuCafe['items'][number], quantity: number) => {
    if (!item.isAvailable || !isOpen) return;
    cart.addItem(
      { menuItemId: item.id, name: item.name, price: item.price, emoji: item.emoji, cafeId: cafe.id, cafeName: cafe.name },
      quantity,
    );
    cart.setDrawerOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Search field */}
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

      {/* Category filters */}
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

      {/* Items Grid */}
      {filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<Search size={24} />}
            title="No matching items found"
            sub="Try adjusting your search terms or selecting a different category filter."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => (
            <article
              key={item.id}
              className={`surface group flex flex-col overflow-hidden transition-shadow hover:shadow-md ${
                !item.isAvailable ? 'opacity-75' : ''
              }`}
            >
              {/* Product Visual Pedestal */}
              <div
                onClick={() => {
                  setSelected(item);
                  setQty(1);
                  setAdded(false);
                }}
                className="relative flex h-32 sm:h-36 cursor-pointer items-center justify-center border-b border-slate-100 bg-pu-50/60 p-4"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200/80 bg-white text-3xl shadow-sm transition-transform duration-300 group-hover:scale-110">
                  <span aria-hidden>{item.emoji}</span>
                </div>

                <div className="absolute left-2.5 top-2.5">
                  <span className="rounded border border-slate-200/80 bg-white/95 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-muted shadow-sm backdrop-blur">
                    {catName(item.categoryId)}
                  </span>
                </div>

                {!item.isAvailable && (
                  <div className="absolute right-2.5 top-2.5">
                    <span className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                      Out of Stock
                    </span>
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="flex flex-1 flex-col p-4">
                <button
                  onClick={() => {
                    setSelected(item);
                    setQty(1);
                  }}
                  className="text-left text-sm font-semibold text-ink transition-colors hover:text-pu-600 line-clamp-1"
                >
                  {item.name}
                </button>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
                  {item.description}
                </p>

                {/* Price and Cart button */}
                <div className="mt-auto flex items-center justify-between pt-3.5 border-t border-slate-100">
                  <span className="font-mono text-sm font-bold text-ink">
                    {inr(item.price)}
                  </span>

                  <button
                    onClick={() => doAdd(item, 1)}
                    disabled={!item.isAvailable || !isOpen}
                    className="btn-solid-pu px-3 py-1.5"
                    aria-label={`Add ${item.name} to cart`}
                  >
                    <Plus size={13} aria-hidden />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Item Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Item Details">
        {selected && (
          <div className="space-y-4">
            <div
              className="flex h-36 items-center justify-center rounded-xl border border-slate-200/80 bg-pu-50/60 text-6xl"
              aria-hidden
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                {selected.emoji}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-ink">{selected.name}</h3>
                <span className="font-mono text-lg font-bold text-ink">{inr(selected.price)}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">{selected.description}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge tone="gray">{catName(selected.categoryId)}</Badge>
              {selected.isAvailable ? (
                <Badge tone="green">AVAILABLE</Badge>
              ) : (
                <Badge tone="red">OUT OF STOCK</Badge>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-xs font-semibold text-slate-600">Quantity</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center font-mono text-sm font-bold text-ink">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(99, q + 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                doAdd(selected, qty);
                setSelected(null);
              }}
              disabled={!selected.isAvailable || !isOpen}
              className="btn-solid-pu mt-3 w-full py-2.5"
            >
              {added
                ? 'Added to cart ✓'
                : !isOpen
                ? 'Cafe is closed'
                : !selected.isAvailable
                ? 'Currently unavailable'
                : `ADD TO CART — ${inr(selected.price * qty)}`}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pu-500 ${
        active
          ? 'bg-pu-600 text-white shadow-sm'
          : 'border border-slate-200 bg-white text-ink/70 hover:bg-pu-50 hover:text-pu-700'
      }`}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

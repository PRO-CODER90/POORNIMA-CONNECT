'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Archive, ArchiveRestore, Boxes, History, Package, PackageX, Pencil, Plus, Search, UtensilsCrossed } from 'lucide-react';
import { StatCard, EmptyState, ErrorNote, Skeleton, Spinner } from '@/cafe/components/ui';
import { ProductThumb } from '@/cafe/components/ProductImage';
import { usePolling } from '@/cafe/hooks/usePolling';
import { inr } from '@/cafe/lib/money';
import ItemFormModal from './ItemFormModal';
import StockAdjustModal from './StockAdjustModal';
import StockHistoryDrawer from './StockHistoryDrawer';
import { call, type InventoryApi, type InventoryData, type InventoryItem } from './api';

type StockFilter = 'ALL' | 'OK' | 'LOW' | 'OUT';
type TypeFilter = 'ALL' | 'PREPARED' | 'PACKET';

export default function InventoryManager({ api, cafeName, initial }: { api: InventoryApi; cafeName: string; initial?: InventoryData }) {
  const fetchList = useCallback(async () => {
    const r = await call<InventoryData>(api.list);
    if (!r.ok) throw new Error(r.error);
    return r.data;
  }, [api]);
  // Silent refresh every 5 s so staff see sales come off the stock as they happen.
  const { data: polled, error: loadError, reload } = usePolling(fetchList, 5000);
  const data = polled ?? initial ?? null;

  const [q, setQ] = useState('');
  const [cat, setCat] = useState('ALL');
  const [type, setType] = useState<TypeFilter>('ALL');
  const [stockF, setStockF] = useState<StockFilter>('ALL');
  const [archived, setArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [adjust, setAdjust] = useState<InventoryItem | null>(null);
  const [history, setHistory] = useState<InventoryItem | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [extraCats, setExtraCats] = useState<{ id: string; name: string }[]>([]);

  // Briefly highlight stock numbers that changed since the last poll.
  const prevQty = useRef<Map<string, number | null>>(new Map());
  const [flash, setFlash] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!data) return;
    const changed = data.items.filter((i) => prevQty.current.has(i.id) && prevQty.current.get(i.id) !== i.stockQty).map((i) => i.id);
    prevQty.current = new Map(data.items.map((i) => [i.id, i.stockQty]));
    if (!changed.length) return;
    setFlash(new Set(changed));
    const t = setTimeout(() => setFlash(new Set()), 1200);
    return () => clearTimeout(t);
  }, [data]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const categories = useMemo(() => {
    const all = [...(data?.categories ?? []), ...extraCats];
    return all.filter((c, i) => all.findIndex((x) => x.id === c.id) === i);
  }, [data, extraCats]);

  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data?.items ?? []).filter((i) => {
      if (i.isActive === archived) return false;
      if (cat !== 'ALL' && i.categoryId !== cat) return false;
      if (type !== 'ALL' && i.itemType !== type) return false;
      if (stockF !== 'ALL' && i.stock !== stockF) return false;
      if (term && !i.name.toLowerCase().includes(term) && !(i.sku ?? '').toLowerCase().includes(term)) return false;
      return true;
    });
  }, [data, q, cat, type, stockF, archived]);

  const lowList = (data?.items ?? []).filter((i) => i.isActive && (i.stock === 'LOW' || i.stock === 'OUT'));

  const saved = (msg: string) => {
    setToast(msg);
    reload();
  };

  const toggle = async (i: InventoryItem) => {
    setBusy(i.id);
    setError(null);
    const r = await call(api.item(i.id), { method: 'PATCH', body: { isAvailable: !i.isAvailable } });
    setBusy(null);
    if (!r.ok) return setError(r.error);
    saved(i.isAvailable ? `${i.name} hidden from the menu` : `${i.name} is back on the menu`);
  };

  const archive = async (i: InventoryItem) => {
    if (i.isActive && !window.confirm(`Archive "${i.name}"? It leaves the menu; past orders keep their history.`)) return;
    setBusy(i.id);
    setError(null);
    const r = await call(i.isActive ? api.item(i.id) : api.restore(i.id), { method: i.isActive ? 'DELETE' : 'POST' });
    setBusy(null);
    if (!r.ok) return setError(r.error);
    saved(i.isActive ? `${i.name} archived` : `${i.name} restored`);
  };

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  if (!data) {
    return loadError ? <ErrorNote message={loadError} /> : <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Inventory</h1>
          <p className="mt-1 text-sm text-slate-500">{cafeName} · manage items, stock and photos</p>
        </div>
        <button type="button" className="btn-solid-pu py-2.5" onClick={openAdd} disabled={categories.length === 0}>
          <Plus size={15} aria-hidden /> Add item
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <FilterCard active={stockF === 'ALL' && type === 'ALL'} onClick={() => { setStockF('ALL'); setType('ALL'); }}>
          <StatCard label="Total items" value={data.counts.total} icon={<UtensilsCrossed size={22} />} tint="blue" />
        </FilterCard>
        <FilterCard active={type === 'PACKET' && stockF === 'ALL'} onClick={() => { setType('PACKET'); setStockF('ALL'); }}>
          <StatCard label="Packets in stock" value={data.counts.packetsInStock} icon={<Boxes size={22} />} tint="green" />
        </FilterCard>
        <FilterCard active={stockF === 'LOW'} onClick={() => setStockF('LOW')}>
          <StatCard label="Low stock" value={data.counts.low} icon={<AlertTriangle size={22} />} tint="orange" />
        </FilterCard>
        <FilterCard active={stockF === 'OUT'} onClick={() => setStockF('OUT')}>
          <StatCard label="Out of stock" value={data.counts.out} icon={<PackageX size={22} />} tint="pink" />
        </FilterCard>
      </div>

      {lowList.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
          <AlertTriangle size={16} className="shrink-0 text-amber-600" aria-hidden />
          <span className="font-semibold">Running low:</span>
          {lowList.slice(0, 3).map((i) => (
            <span key={i.id} className="inline-flex items-center gap-1.5">
              {i.name} ({i.stockQty ?? 0})
              <button type="button" className="rounded-lg bg-white px-2 py-0.5 text-xs font-bold text-amber-800 shadow-sm hover:bg-amber-100" onClick={() => setAdjust(i)}>
                Restock
              </button>
            </span>
          ))}
          {lowList.length > 3 ? <span className="text-xs">and {lowList.length - 3} more</span> : null}
        </div>
      ) : null}

      <div className="surface space-y-3 p-3 sm:p-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-48 flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
            <input className="input-pu pl-9" placeholder="Search by name or SKU" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search items" />
          </div>
          <select className="input-pu w-auto" value={type} onChange={(e) => setType(e.target.value as TypeFilter)} aria-label="Item type">
            <option value="ALL">All types</option>
            <option value="PREPARED">Prepared</option>
            <option value="PACKET">Packet</option>
          </select>
          <select className="input-pu w-auto" value={stockF} onChange={(e) => setStockF(e.target.value as StockFilter)} aria-label="Stock level">
            <option value="ALL">Any stock</option>
            <option value="OK">In stock</option>
            <option value="LOW">Low</option>
            <option value="OUT">Out</option>
          </select>
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600">
            <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} className="accent-pu-600" />
            Show archived
          </label>
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {[{ id: 'ALL', name: 'All categories' }, ...categories].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id)}
              aria-pressed={cat === c.id}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${cat === c.id ? 'bg-pu-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-pu-50'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {error ? <ErrorNote message={error} /> : null}
      {categories.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">This cafe has no categories yet. Ask an admin to add one, or add it from the item form once one exists.</div>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          surface
          icon={<Package size={24} />}
          title={data.items.length === 0 ? 'No items yet. Add your first item.' : 'No items match these filters'}
          action={data.items.length === 0 ? <button className="btn-solid-pu" onClick={openAdd}><Plus size={14} aria-hidden /> Add item</button> : undefined}
        />
      ) : (
        <>
          {/* desktop table */}
          <div className="surface hidden overflow-x-auto md:block">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-4 py-3">Item</th>
                  <th scope="col" className="px-3 py-3">Category</th>
                  <th scope="col" className="px-3 py-3">Type</th>
                  <th scope="col" className="px-3 py-3 text-right">Price</th>
                  <th scope="col" className="px-3 py-3">Stock</th>
                  <th scope="col" className="px-3 py-3">Status</th>
                  <th scope="col" className="px-3 py-3">On menu</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-b border-slate-50 last:border-0 hover:bg-pu-50/40">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <ProductThumb src={i.imageUrl} name={i.name} className="h-12 w-12" />
                          {i.isDemoImage ? <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded bg-slate-700 px-1 text-[8px] font-bold uppercase text-white">Demo</span> : null}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                            <VegDot veg={i.isVeg} />
                            <span className="truncate">{i.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-500">{[i.packSize, i.sku].filter(Boolean).join(' · ') || ' '}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-600">{i.categoryName}</td>
                    <td className="px-3 py-2.5"><TypeChip type={i.itemType} /></td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="font-bold text-slate-900">{inr(i.price)}</span>
                      {i.mrp && i.mrp > i.price ? <span className="ml-1 text-[11px] text-slate-400 line-through">{inr(i.mrp)}</span> : null}
                    </td>
                    <td className="px-3 py-2.5"><StockCell i={i} flash={flash.has(i.id)} onAdjust={() => setAdjust(i)} /></td>
                    <td className="px-3 py-2.5"><StatusPill i={i} /></td>
                    <td className="px-3 py-2.5"><Switch on={i.isAvailable} disabled={!i.isActive || busy === i.id} onClick={() => toggle(i)} label={`Show ${i.name} on the menu`} /></td>
                    <td className="px-4 py-2.5"><RowActions i={i} busy={busy === i.id} onEdit={() => { setEditing(i); setFormOpen(true); }} onHistory={() => setHistory(i)} onArchive={() => archive(i)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* mobile cards */}
          <div className="space-y-3 md:hidden">
            {items.map((i) => (
              <div key={i.id} className="surface p-3">
                <div className="flex gap-3">
                  <div className="relative">
                    <ProductThumb src={i.imageUrl} name={i.name} className="h-16 w-16 rounded-xl" />
                    {i.isDemoImage ? <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded bg-slate-700 px-1 text-[8px] font-bold uppercase text-white">Demo</span> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <VegDot veg={i.isVeg} />
                      <span className="truncate">{i.name}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                      <TypeChip type={i.itemType} />
                      <span>{i.categoryName}</span>
                      {i.packSize ? <span>· {i.packSize}</span> : null}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-bold">{inr(i.price)}</span>
                      <StatusPill i={i} />
                    </div>
                  </div>
                  <Switch on={i.isAvailable} disabled={!i.isActive || busy === i.id} onClick={() => toggle(i)} label={`Show ${i.name} on the menu`} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                  <StockCell i={i} flash={flash.has(i.id)} onAdjust={() => setAdjust(i)} />
                  <RowActions i={i} busy={busy === i.id} onEdit={() => { setEditing(i); setFormOpen(true); }} onHistory={() => setHistory(i)} onArchive={() => archive(i)} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <ItemFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        api={api}
        item={editing}
        categories={categories}
        onSaved={(it) => saved(editing ? `${it.name} saved` : `${it.name} added`)}
        onCategoryCreated={(c) => setExtraCats((x) => [...x, c])}
        onAdjustStock={(it) => setAdjust(it)}
      />
      <StockAdjustModal item={adjust} api={api} onClose={() => setAdjust(null)} onSaved={(it) => saved(`${it.name}: stock now ${it.stockQty}`)} />
      <StockHistoryDrawer item={history} api={api} onClose={() => setHistory(null)} />

      {toast ? (
        <div className="fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4" role="status" aria-live="polite">
          <div className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">{toast}</div>
        </div>
      ) : null}
    </div>
  );
}

function FilterCard({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`rounded-[20px] text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pu-500 ${active ? 'ring-2 ring-pu-500' : 'hover:shadow-md'}`}>
      {children}
    </button>
  );
}

function VegDot({ veg }: { veg: boolean }) {
  return (
    <span className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border-2 ${veg ? 'border-emerald-600' : 'border-rose-700'}`} title={veg ? 'Veg' : 'Non-veg'}>
      <span className={`h-1.5 w-1.5 rounded-full ${veg ? 'bg-emerald-600' : 'bg-rose-700'}`} aria-hidden />
      <span className="sr-only">{veg ? 'Veg' : 'Non-veg'}</span>
    </span>
  );
}

function TypeChip({ type }: { type: string }) {
  return type === 'PACKET' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-800"><Package size={10} aria-hidden />Packet</span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-800"><UtensilsCrossed size={10} aria-hidden />Prepared</span>
  );
}

function StockCell({ i, flash, onAdjust }: { i: InventoryItem; flash: boolean; onAdjust: () => void }) {
  if (i.itemType !== 'PACKET') return <span className="text-xs text-slate-400">n/a</span>;
  const tone = i.stock === 'OUT' ? 'text-rose-700' : i.stock === 'LOW' ? 'text-amber-700' : 'text-slate-900';
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`min-w-8 rounded-md px-1 text-center font-mono text-base font-bold transition-colors ${tone} ${flash ? 'bg-pu-100' : ''}`}>{i.stockQty ?? 0}</span>
      {i.isActive ? (
        <button type="button" onClick={onAdjust} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-pu-700 hover:bg-pu-50">
          Restock / adjust
        </button>
      ) : null}
    </span>
  );
}

function StatusPill({ i }: { i: InventoryItem }) {
  const [label, cls] = !i.isActive
    ? ['Archived', 'bg-slate-200 text-slate-700']
    : !i.isAvailable
      ? ['Hidden', 'bg-slate-100 text-slate-600']
      : i.stock === 'EXPIRED'
        ? ['Expired', 'bg-rose-100 text-rose-800']
        : i.stock === 'OUT'
          ? ['Out of stock', 'bg-rose-100 text-rose-800']
          : i.stock === 'LOW'
            ? ['Low stock', 'bg-amber-100 text-amber-800']
            : ['Available', 'bg-emerald-100 text-emerald-800'];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}>{label}</span>;
}

function Switch({ on, disabled, onClick, label }: { on: boolean; disabled?: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function RowActions({ i, busy, onEdit, onHistory, onArchive }: { i: InventoryItem; busy: boolean; onEdit: () => void; onHistory: () => void; onArchive: () => void }) {
  const btn = 'rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40';
  return (
    <div className="flex justify-end gap-0.5">
      {i.isActive ? <button type="button" className={btn} onClick={onEdit} aria-label={`Edit ${i.name}`} title="Edit"><Pencil size={15} /></button> : null}
      {i.itemType === 'PACKET' ? <button type="button" className={btn} onClick={onHistory} aria-label={`Stock history for ${i.name}`} title="Stock history"><History size={15} /></button> : null}
      <button type="button" className={btn} onClick={onArchive} disabled={busy} aria-label={i.isActive ? `Archive ${i.name}` : `Restore ${i.name}`} title={i.isActive ? 'Archive' : 'Restore'}>
        {busy ? <Spinner /> : i.isActive ? <Archive size={15} /> : <ArchiveRestore size={15} />}
      </button>
    </div>
  );
}

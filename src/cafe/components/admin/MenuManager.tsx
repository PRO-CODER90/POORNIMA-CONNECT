'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, ErrorNote, Modal, Spinner } from '@/cafe/components/ui';
import { inr } from '@/cafe/lib/money';

export interface MenuItemRow {
  id: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
  categoryId: string;
  isAvailable: boolean;
  isActive: boolean;
  category: { id: string; name: string };
}

export interface CategoryOption {
  id: string;
  name: string;
}

export interface CafeOption {
  id: string;
  code: string;
  name: string;
}

export default function MenuManager({ cafes, initialCafeId, initialItems, initialCategories }: {
  cafes: CafeOption[];
  initialCafeId: string;
  initialItems: MenuItemRow[];
  initialCategories: CategoryOption[];
}) {
  const router = useRouter();
  const [cafeId, setCafeId] = useState(initialCafeId);
  const [items, setItems] = useState(initialItems);
  const [categories, setCategories] = useState(initialCategories);
  const [loadingCafe, setLoadingCafe] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<MenuItemRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [addForm, setAddForm] = useState({ name: '', description: '', price: '', emoji: '', categoryId: '' });
  const [editForm, setEditForm] = useState({ name: '', description: '', price: '', emoji: '', categoryId: '' });

  const switchCafe = async (id: string) => {
    setCafeId(id);
    setLoadingCafe(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/cafes/${id}/menu`);
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed to load menu');
      const d = await r.json();
      setItems(d.items);
      setCategories(d.categories.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load menu');
    } finally {
      setLoadingCafe(false);
    }
  };

  const saveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('add');
    setError(null);
    try {
      const r = await fetch(`/api/admin/cafes/${cafeId}/menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addForm, price: Number(addForm.price) }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Could not add item');
      setItems((prev) => [...prev, d.item]);
      setAddOpen(false);
      setAddForm({ name: '', description: '', price: '', emoji: '', categoryId: '' });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add item');
    } finally {
      setBusy(null);
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    setBusy('edit');
    setError(null);
    try {
      const r = await fetch(`/api/admin/menu-items/${editItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, price: Number(editForm.price) }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Could not update item');
      setItems((prev) => prev.map((i) => (i.id === editItem.id ? d.item : i)));
      setEditItem(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update item');
    } finally {
      setBusy(null);
    }
  };

  const toggleAvailability = async (item: MenuItemRow) => {
    setBusy(item.id);
    try {
      const r = await fetch(`/api/admin/menu-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !item.isAvailable }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed');
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isAvailable: !i.isAvailable } : i)));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (item: MenuItemRow) => {
    if (!window.confirm(`Delete "${item.name}"? Existing orders keep their saved prices and history.`)) return;
    setBusy(item.id);
    try {
      const r = await fetch(`/api/admin/menu-items/${item.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed');
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isActive: false, isAvailable: false } : i)));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <select className="input max-w-xs" value={cafeId} onChange={(e) => switchCafe(e.target.value)} aria-label="Select cafe" disabled={loadingCafe}>
          {cafes.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
        </select>
        <button onClick={() => setAddOpen(true)} className="btn-primary" disabled={loadingCafe || categories.length === 0}>
          <Plus size={16} aria-hidden /> Add item
        </button>
      </div>
      {categories.length === 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This cafe has no active categories. Create categories first in the <span className="font-bold">Categories</span> page.
        </div>
      )}
      {error && <div className="mb-4"><ErrorNote message={error} /></div>}

      <div className="card overflow-x-auto">
        {loadingCafe ? (
          <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-10" />)}</div>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3">Availability</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className={`border-b border-slate-50 hover:bg-pu-50/60 ${!i.isActive ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl" aria-hidden>{i.emoji}</span>
                      <div>
                        <div className="font-bold text-slate-800">{i.name}</div>
                        <div className="max-w-[220px] truncate text-[11px] text-slate-400">{i.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge tone="gray">{i.category?.name ?? '—'}</Badge></td>
                  <td className="px-4 py-3 text-right font-black">{inr(i.price)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleAvailability(i)}
                      disabled={!i.isActive || busy === i.id}
                      className={`chip ${i.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'} hover:opacity-80 disabled:cursor-not-allowed`}
                      aria-label={`Toggle availability for ${i.name}`}
                    >
                      {busy === i.id ? <Spinner className="h-3 w-3" /> : i.isAvailable ? '● AVAILABLE' : '● OUT OF STOCK'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={i.isActive ? 'green' : 'red'}>{i.isActive ? 'ACTIVE' : 'DELETED'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => { setEditItem(i); setEditForm({ name: i.name, description: i.description, price: String(i.price), emoji: i.emoji, categoryId: i.categoryId }); }}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label={`Edit ${i.name}`}
                      >
                        <Pencil size={15} />
                      </button>
                      {i.isActive && (
                        <button onClick={() => remove(i)} disabled={busy === i.id} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40" aria-label={`Delete ${i.name}`}>
                          {busy === i.id ? <Spinner /> : <Trash2 size={15} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* add item */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add menu item" wide>
        <form onSubmit={saveNew} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="ni-name">Item name</label>
            <input id="ni-name" className="input" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label" htmlFor="ni-cat">Category</label>
            <select id="ni-cat" className="input" value={addForm.categoryId} onChange={(e) => setAddForm((f) => ({ ...f, categoryId: e.target.value }))} required>
              <option value="">Choose…</option>
              {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ni-price">Price (₹)</label>
            <input id="ni-price" type="number" min={1} step={1} className="input" value={addForm.price} onChange={(e) => setAddForm((f) => ({ ...f, price: e.target.value }))} required />
          </div>
          <div>
            <label className="label" htmlFor="ni-emoji">Emoji (display image)</label>
            <input id="ni-emoji" className="input" value={addForm.emoji} onChange={(e) => setAddForm((f) => ({ ...f, emoji: e.target.value }))} maxLength={4} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="ni-desc">Description</label>
            <textarea id="ni-desc" className="input min-h-16" value={addForm.description} onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <button type="submit" className="btn-primary sm:col-span-2" disabled={busy === 'add'}>{busy === 'add' ? <><Spinner /> Adding…</> : 'Add item to menu'}</button>
        </form>
      </Modal>

      {/* edit item */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title={`Edit ${editItem?.name ?? 'item'}`} wide>
        <form onSubmit={saveEdit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="ei-name">Item name</label>
            <input id="ei-name" className="input" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label" htmlFor="ei-cat">Category</label>
            <select id="ei-cat" className="input" value={editForm.categoryId} onChange={(e) => setEditForm((f) => ({ ...f, categoryId: e.target.value }))} required>
              {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ei-price">Price (₹)</label>
            <input id="ei-price" type="number" min={1} step={1} className="input" value={editForm.price} onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))} required />
            <p className="mt-1 text-[11px] text-amber-600">Changing the price never affects past orders — they keep the price at order time.</p>
          </div>
          <div>
            <label className="label" htmlFor="ei-emoji">Emoji</label>
            <input id="ei-emoji" className="input" value={editForm.emoji} onChange={(e) => setEditForm((f) => ({ ...f, emoji: e.target.value }))} maxLength={4} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="ei-desc">Description</label>
            <textarea id="ei-desc" className="input min-h-16" value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <button type="submit" className="btn-primary sm:col-span-2" disabled={busy === 'edit'}>{busy === 'edit' ? <><Spinner /> Saving…</> : 'Save item'}</button>
        </form>
      </Modal>
    </div>
  );
}

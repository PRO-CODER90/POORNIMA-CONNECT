'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, ErrorNote, Modal, Spinner } from '@/cafe/components/ui';

export interface CategoryRow {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  _count: { items: number };
}

export interface CafeOption {
  id: string;
  code: string;
  name: string;
}

export default function CategoryManager({ cafes, initialCafeId, initialCategories }: {
  cafes: CafeOption[];
  initialCafeId: string;
  initialCategories: CategoryRow[];
}) {
  const router = useRouter();
  const [cafeId, setCafeId] = useState(initialCafeId);
  const [rows, setRows] = useState(initialCategories);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<CategoryRow | null>(null);
  const [addForm, setAddForm] = useState({ name: '', description: '' });
  const [editForm, setEditForm] = useState({ name: '', description: '' });

  const switchCafe = async (id: string) => {
    setCafeId(id);
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/cafes/${id}/categories`);
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed');
      setRows((await r.json()).categories);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('add');
    setError(null);
    try {
      const r = await fetch(`/api/admin/cafes/${cafeId}/categories`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(addForm) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Could not create category');
      setRows((prev) => [...prev, d.category]);
      setAddOpen(false);
      setAddForm({ name: '', description: '' });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create category');
    } finally {
      setBusy(null);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRow) return;
    setBusy('edit');
    setError(null);
    try {
      const r = await fetch(`/api/admin/categories/${editRow.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Could not update category');
      setRows((prev) => prev.map((c) => (c.id === editRow.id ? { ...c, name: d.category.name, description: d.category.description } : c)));
      setEditRow(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update category');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (row: CategoryRow) => {
    if (!window.confirm(`Delete "${row.name}"? Categories with items are deactivated instead (history is preserved).`)) return;
    setBusy(row.id);
    setError(null);
    try {
      const r = await fetch(`/api/admin/categories/${row.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed');
      setRows((prev) => prev.filter((c) => c.id !== row.id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(null);
    }
  };

  const toggleActive = async (row: CategoryRow) => {
    setBusy(row.id);
    try {
      const r = await fetch(`/api/admin/categories/${row.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !row.isActive }) });
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed');
      setRows((prev) => prev.map((c) => (c.id === row.id ? { ...c, isActive: !c.isActive } : c)));
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
        <select className="input max-w-xs" value={cafeId} onChange={(e) => switchCafe(e.target.value)} aria-label="Select cafe" disabled={loading}>
          {cafes.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
        </select>
        <button onClick={() => setAddOpen(true)} className="btn-primary" disabled={loading}><Plus size={16} aria-hidden /> Add category</button>
      </div>
      {error && <div className="mb-4"><ErrorNote message={error} /></div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-400">No categories for this cafe yet.</p>
        ) : (
          rows.map((c) => (
            <div key={c.id} className={`card p-4 ${!c.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-slate-900">{c.name}</span>
                <Badge tone={c.isActive ? 'green' : 'red'}>{c.isActive ? 'ACTIVE' : 'INACTIVE'}</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-400">{c.description || 'No description'}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{c._count.items} item{c._count.items === 1 ? '' : 's'}</p>
              <div className="mt-3 flex gap-1.5">
                <button onClick={() => { setEditRow(c); setEditForm({ name: c.name, description: c.description }); }} className="btn-secondary !px-3 !py-1.5 text-xs"><Pencil size={13} aria-hidden /> Edit</button>
                <button onClick={() => toggleActive(c)} disabled={busy === c.id} className="btn-secondary !px-3 !py-1.5 text-xs">
                  {busy === c.id ? <Spinner className="h-3 w-3" /> : c.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => remove(c)} disabled={busy === c.id} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40" aria-label={`Delete ${c.name}`}>
                  {busy === c.id ? <Spinner /> : <Trash2 size={14} />}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add category">
        <form onSubmit={add} className="space-y-4">
          <div>
            <label className="label" htmlFor="nc-name">Category name</label>
            <input id="nc-name" className="input" placeholder="e.g. SNACKS" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label" htmlFor="nc-desc">Description (optional)</label>
            <input id="nc-desc" className="input" value={addForm.description} onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={busy === 'add'}>{busy === 'add' ? <><Spinner /> Adding…</> : 'Create category'}</button>
        </form>
      </Modal>

      <Modal open={!!editRow} onClose={() => setEditRow(null)} title={`Edit ${editRow?.name ?? 'category'}`}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label" htmlFor="ec-name">Category name</label>
            <input id="ec-name" className="input" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label" htmlFor="ec-desc">Description</label>
            <input id="ec-desc" className="input" value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={busy === 'edit'}>{busy === 'edit' ? <><Spinner /> Saving…</> : 'Save category'}</button>
        </form>
      </Modal>
    </div>
  );
}

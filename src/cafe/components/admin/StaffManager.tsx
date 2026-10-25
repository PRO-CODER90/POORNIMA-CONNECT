'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, RotateCcw, UserX } from 'lucide-react';
import { Badge, ErrorNote, Modal, Spinner } from '@/cafe/components/ui';
import { fmtDateTime } from '@/cafe/lib/dates';

export interface StaffRow {
  id: string;
  staffCode: string;
  name: string;
  email: string;
  cafe: { id: string; code: string; name: string };
  status: 'ACTIVE' | 'DEACTIVATED';
  lastLogin: string | null;
}

export interface CafeOption {
  id: string;
  code: string;
  name: string;
}

export default function StaffManager({ initial, cafes }: { initial: StaffRow[]; cafes: CafeOption[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<StaffRow | null>(null);
  const [pwRow, setPwRow] = useState<StaffRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', cafeId: '' });
  const [editForm, setEditForm] = useState({ name: '', cafeId: '' });
  const [newPw, setNewPw] = useState('');

  const after = () => {
    router.refresh();
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('add');
    setError(null);
    try {
      const r = await fetch('/api/admin/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(addForm) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Could not add staff member.');
      setAddOpen(false);
      setAddForm({ name: '', email: '', password: '', cafeId: '' });
      after();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add staff member.');
    } finally {
      setBusy(null);
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRow) return;
    setBusy('edit');
    setError(null);
    try {
      const r = await fetch(`/api/admin/staff/${editRow.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Could not update staff member.');
      setRows((prev) => prev.map((s) => (s.id === editRow.id ? { ...s, name: editForm.name, cafe: cafes.find((c) => c.id === editForm.cafeId) ?? s.cafe } : s)));
      setEditRow(null);
      after();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update staff member.');
    } finally {
      setBusy(null);
    }
  };

  const resetPw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwRow) return;
    setBusy('pw');
    setError(null);
    try {
      const r = await fetch(`/api/admin/staff/${pwRow.id}/password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: newPw }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Could not reset password.');
      setPwRow(null);
      setNewPw('');
      after();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password.');
    } finally {
      setBusy(null);
    }
  };

  const deactivate = async (row: StaffRow) => {
    if (!window.confirm(`Deactivate ${row.name}? They will no longer be able to log in.`)) return;
    setBusy(row.id);
    try {
      const r = await fetch(`/api/admin/staff/${row.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: false }) });
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed');
      setRows((prev) => prev.map((s) => (s.id === row.id ? { ...s, status: 'DEACTIVATED' } : s)));
      after();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{rows.length} staff members · each locked to one cafe by the backend</p>
        <button onClick={() => setAddOpen(true)} className="btn-primary"><Plus size={16} aria-hidden /> Add staff</button>
      </div>
      {error && <div className="mb-4"><ErrorNote message={error} /></div>}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3">Staff ID</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Assigned Cafe</th>
              <th className="px-4 py-3">Last Login</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-slate-50 hover:bg-pu-50/60">
                <td className="px-4 py-3 font-bold text-slate-800">{s.name}</td>
                <td className="px-4 py-3 font-mono text-xs font-bold">{s.staffCode}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{s.email}</td>
                <td className="px-4 py-3 text-xs font-semibold">{s.cafe.name}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{s.lastLogin ? fmtDateTime(s.lastLogin) : 'never'}</td>
                <td className="px-4 py-3"><Badge tone={s.status === 'ACTIVE' ? 'green' : 'red'}>{s.status}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <button onClick={() => { setEditRow(s); setEditForm({ name: s.name, cafeId: s.cafe.id }); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={`Edit ${s.name}`}><Pencil size={15} /></button>
                    <button onClick={() => { setPwRow(s); setNewPw(''); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={`Reset password for ${s.name}`}><RotateCcw size={15} /></button>
                    {s.status === 'ACTIVE' && (
                      <button onClick={() => deactivate(s)} disabled={busy === s.id} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40" aria-label={`Deactivate ${s.name}`}>
                        {busy === s.id ? <Spinner /> : <UserX size={15} />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* add modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add cafe staff">
        <form onSubmit={add} className="space-y-4">
          <div>
            <label className="label" htmlFor="st-name">Full name</label>
            <input id="st-name" className="input" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} required minLength={2} />
          </div>
          <div>
            <label className="label" htmlFor="st-email">Email</label>
            <input id="st-email" type="email" className="input" value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} required />
          </div>
          <div>
            <label className="label" htmlFor="st-pw">Password</label>
            <input id="st-pw" className="input" value={addForm.password} onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))} required minLength={8} maxLength={64} />
            <p className="mt-1.5 text-[11px] text-slate-400">At least 8 characters with a letter and a number. Staff sign in on the main login page with their staff ID (e.g. STF001) and this password.</p>
          </div>
          <div>
            <label className="label" htmlFor="st-cafe">Assigned cafe</label>
            <select id="st-cafe" className="input" value={addForm.cafeId} onChange={(e) => setAddForm((f) => ({ ...f, cafeId: e.target.value }))} required>
              <option value="">Choose a cafe…</option>
              {cafes.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <p className="mt-1.5 text-[11px] text-slate-400">This staff member will only ever see orders for this cafe (enforced by the backend).</p>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={busy === 'add'}>{busy === 'add' ? <><Spinner /> Adding…</> : 'Add staff member'}</button>
        </form>
      </Modal>

      {/* edit modal */}
      <Modal open={!!editRow} onClose={() => setEditRow(null)} title={`Edit ${editRow?.name ?? 'staff'}`}>
        <form onSubmit={saveEdit} className="space-y-4">
          <div>
            <label className="label" htmlFor="ed-name">Full name</label>
            <input id="ed-name" className="input" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required minLength={2} />
          </div>
          <div>
            <label className="label" htmlFor="ed-cafe">Assigned cafe</label>
            <select id="ed-cafe" className="input" value={editForm.cafeId} onChange={(e) => setEditForm((f) => ({ ...f, cafeId: e.target.value }))} required>
              {cafes.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={busy === 'edit'}>{busy === 'edit' ? <><Spinner /> Saving…</> : 'Save changes'}</button>
        </form>
      </Modal>

      {/* password modal */}
      <Modal open={!!pwRow} onClose={() => setPwRow(null)} title={`Reset password — ${pwRow?.name ?? ''}`}>
        <form onSubmit={resetPw} className="space-y-4">
          <div>
            <label className="label" htmlFor="rp-pw">New password</label>
            <input id="rp-pw" className="input" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={8} maxLength={64} />
            <p className="mt-1.5 text-[11px] text-slate-400">At least 8 characters with a letter and a number. Share it with the staff member securely; their other sessions are signed out.</p>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={busy === 'pw'}>{busy === 'pw' ? <><Spinner /> Resetting…</> : 'Reset password'}</button>
        </form>
      </Modal>
    </div>
  );
}

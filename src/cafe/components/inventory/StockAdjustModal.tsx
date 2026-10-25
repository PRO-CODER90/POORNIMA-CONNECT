'use client';

import { useEffect, useState } from 'react';
import { Modal, Spinner, ErrorNote } from '@/cafe/components/ui';
import { call, type InventoryApi, type InventoryItem } from './api';

type Mode = 'add' | 'remove' | 'set';
const REASONS: Record<Mode, { value: string; label: string }[]> = {
  add: [{ value: 'RESTOCK', label: 'New delivery / return' }],
  remove: [
    { value: 'WASTAGE', label: 'Damaged' },
    { value: 'EXPIRED', label: 'Expired' },
    { value: 'ADJUST', label: 'Correction' },
  ],
  set: [{ value: 'ADJUST', label: 'Stocktake' }],
};
const TABS: { mode: Mode; label: string }[] = [
  { mode: 'add', label: 'Add stock' },
  { mode: 'remove', label: 'Remove' },
  { mode: 'set', label: 'Set exact count' },
];

export default function StockAdjustModal({
  item,
  api,
  onClose,
  onSaved,
  initialMode = 'add',
}: {
  item: InventoryItem | null;
  api: InventoryApi;
  onClose: () => void;
  onSaved: (item: InventoryItem) => void;
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('RESTOCK');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!item) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fresh form for each item
    setMode(initialMode);
    setQty('');
    setReason(REASONS[initialMode][0].value);
    setNote('');
    setErrors({});
    setError(null);
  }, [item, initialMode]);

  if (!item) return null;
  const current = item.stockQty ?? 0;
  const n = Number(qty || 0);
  const result = mode === 'add' ? current + n : mode === 'remove' ? current - n : n;

  const switchMode = (m: Mode) => {
    setMode(m);
    setReason(REASONS[m][0].value);
    setErrors({});
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (qty === '' || (mode !== 'set' && n < 1)) errs.qty = 'Enter a quantity.';
    if (result < 0) errs.qty = `Only ${current} in stock.`;
    if (mode !== 'add' && !note.trim()) errs.note = 'Add a short note for this change.';
    if (Object.keys(errs).length) return setErrors(errs);
    setBusy(true);
    setError(null);
    const r = await call<{ item: InventoryItem }>(api.stock(item.id), { method: 'POST', body: { mode, qty: n, reason, note } });
    setBusy(false);
    if (!r.ok) {
      setErrors(r.fields ?? {});
      return setError(r.error);
    }
    onSaved(r.data.item);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={`Stock · ${item.name}`}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 p-1" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.mode}
              type="button"
              role="tab"
              aria-selected={mode === t.mode}
              onClick={() => switchMode(t.mode)}
              className={`rounded-lg px-2 py-1.5 text-xs font-bold ${mode === t.mode ? 'bg-pu-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div>
          <label className="label" htmlFor="sa-qty">{mode === 'set' ? 'Counted quantity' : 'Quantity'}</label>
          <input
            id="sa-qty"
            className="input"
            inputMode="numeric"
            value={qty}
            onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))}
            autoFocus
            aria-invalid={errors.qty ? true : undefined}
            aria-describedby={errors.qty ? 'sa-qty-err' : undefined}
          />
          {errors.qty ? <p id="sa-qty-err" className="mt-1 text-xs font-medium text-rose-600">{errors.qty}</p> : null}
        </div>

        <div>
          <label className="label" htmlFor="sa-reason">Reason</label>
          <select id="sa-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS[mode].map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="sa-note">Note {mode === 'add' ? '(optional)' : '*'}</label>
          <input
            id="sa-note"
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            aria-invalid={errors.note ? true : undefined}
            aria-describedby={errors.note ? 'sa-note-err' : undefined}
          />
          {errors.note ? <p id="sa-note-err" className="mt-1 text-xs font-medium text-rose-600">{errors.note}</p> : null}
        </div>

        <div className="flex items-center justify-between rounded-xl bg-pu-50/70 px-3 py-2.5 text-sm">
          <span className="text-slate-600">Now <strong className="text-ink">{current}</strong></span>
          <span aria-hidden>→</span>
          <span className="text-slate-600">
            After <strong className={result < 0 ? 'text-rose-600' : 'text-ink'}>{qty === '' ? '—' : result}</strong>
          </span>
        </div>

        {error ? <ErrorNote message={error} /> : null}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-outline-pu" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-solid-pu" disabled={busy}>{busy ? <Spinner className="h-3.5 w-3.5" /> : null}Confirm</button>
        </div>
      </form>
    </Modal>
  );
}

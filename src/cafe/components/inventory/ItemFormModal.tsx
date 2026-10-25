'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Modal, Spinner, ErrorNote } from '@/cafe/components/ui';
import { parseItem } from '@/cafe/lib/menuItemSchema';
import { isDemoImage } from '@/cafe/lib/stock';
import ImageField from './ImageField';
import { call, type InventoryApi, type InventoryItem } from './api';

interface Form {
  name: string;
  categoryId: string;
  description: string;
  isVeg: boolean;
  itemType: 'PREPARED' | 'PACKET';
  price: string;
  mrp: string;
  packSize: string;
  sku: string;
  stockQty: string;
  lowStockThreshold: string;
  expiryDate: string;
  imageUrl: string | null;
  isAvailable: boolean;
}

const blank = (categoryId = ''): Form => ({
  name: '', categoryId, description: '', isVeg: true, itemType: 'PREPARED', price: '', mrp: '', packSize: '', sku: '',
  stockQty: '', lowStockThreshold: '5', expiryDate: '', imageUrl: null, isAvailable: true,
});

const fromItem = (i: InventoryItem): Form => ({
  name: i.name, categoryId: i.categoryId, description: i.description, isVeg: i.isVeg,
  itemType: i.itemType === 'PACKET' ? 'PACKET' : 'PREPARED', price: String(i.price), mrp: i.mrp?.toString() ?? '',
  packSize: i.packSize ?? '', sku: i.sku ?? '', stockQty: i.stockQty?.toString() ?? '', lowStockThreshold: String(i.lowStockThreshold),
  expiryDate: i.expiryDate ?? '', imageUrl: isDemoImage(i.imageUrl) ? null : i.imageUrl, isAvailable: i.isAvailable,
});

const ORDER: (keyof Form)[] = ['name', 'categoryId', 'description', 'itemType', 'price', 'mrp', 'packSize', 'sku', 'stockQty', 'lowStockThreshold', 'expiryDate'];

export default function ItemFormModal({
  open,
  onClose,
  api,
  item,
  categories,
  onSaved,
  onCategoryCreated,
  onAdjustStock,
}: {
  open: boolean;
  onClose: () => void;
  api: InventoryApi;
  /** null = add a new item */
  item: InventoryItem | null;
  categories: { id: string; name: string }[];
  onSaved: (item: InventoryItem) => void;
  onCategoryCreated: (c: { id: string; name: string }) => void;
  onAdjustStock: (item: InventoryItem) => void;
}) {
  const [form, setForm] = useState<Form>(blank());
  const [initial, setInitial] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newCat, setNewCat] = useState<string | null>(null);
  const [catBusy, setCatBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!open) return;
    const f = item ? fromItem(item) : blank(categories[0]?.id ?? '');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the form each time the modal opens
    setForm(f);
    setInitial(JSON.stringify(f));
    setErrors({});
    setFormError(null);
    setNewCat(null);
    // Only when the modal opens for an item; later category additions must not reset typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item]);

  const editing = !!item;
  const packet = form.itemType === 'PACKET';
  const switchingToPacket = editing && item.itemType !== 'PACKET' && packet;
  const dirty = JSON.stringify(form) !== initial;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const close = () => {
    if (dirty && !window.confirm('Discard your unsaved changes?')) return;
    onClose();
  };

  const payload = () => ({
    ...form,
    price: form.price,
    stockQty: editing && !switchingToPacket ? null : form.stockQty,
  });

  const focusFirst = (errs: Record<string, string>) => {
    const first = ORDER.find((k) => errs[k]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || uploading) return;
    const check = parseItem(payload(), !editing || switchingToPacket);
    if (!check.ok) {
      setErrors(check.errors);
      focusFirst(check.errors);
      return;
    }
    setSaving(true);
    setErrors({});
    setFormError(null);
    const r = await call<{ item: InventoryItem }>(editing ? api.item(item.id) : api.create, { method: editing ? 'PATCH' : 'POST', body: payload() });
    setSaving(false);
    if (!r.ok) {
      if (r.fields) {
        setErrors(r.fields);
        focusFirst(r.fields);
      }
      setFormError(r.error);
      return;
    }
    onSaved(r.data.item);
    onClose();
  };

  const addCategory = async () => {
    if (!newCat?.trim()) return;
    setCatBusy(true);
    const r = await call<{ category: { id: string; name: string } }>(api.categories, { method: 'POST', body: { name: newCat } });
    setCatBusy(false);
    if (!r.ok) return setErrors((x) => ({ ...x, categoryId: r.error }));
    onCategoryCreated(r.data.category);
    set('categoryId', r.data.category.id);
    setNewCat(null);
  };

  const catName = categories.find((c) => c.id === form.categoryId)?.name;
  const field = (k: keyof Form) => ({
    name: k,
    id: `if-${k}`,
    'aria-invalid': errors[k] ? true : undefined,
    'aria-describedby': errors[k] ? `if-${k}-err` : undefined,
  });
  const err = (k: string) => (errors[k] ? <p id={`if-${k}-err`} className="mt-1 text-xs font-medium text-rose-600">{errors[k]}</p> : null);

  return (
    <Modal open={open} onClose={close} title={editing ? `Edit ${item.name}` : 'Add item'} wide>
      <form ref={formRef} onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <section aria-label="Photo">
          <h4 className="label">Photo</h4>
          <div>
            <ImageField
              value={form.imageUrl}
              onChange={(u) => set('imageUrl', u)}
              uploadUrl={api.upload}
              categoryName={catName}
              itemType={form.itemType}
              onBusyChange={setUploading}
              error={errors.imageUrl}
            />
          </div>
        </section>

        <div className="space-y-5">
          <section aria-label="Details" className="space-y-3">
            <div>
              <label className="label" htmlFor="if-name">Item name *</label>
              <input {...field('name')} className="input" value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={80} />
              {err('name')}
            </div>
            <div>
              <label className="label" htmlFor="if-categoryId">Category *</label>
              {newCat === null ? (
                <div className="flex gap-2">
                  <select {...field('categoryId')} className="input" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                    <option value="">Choose…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button type="button" className="btn-outline-pu shrink-0" onClick={() => setNewCat('')}>
                    <Plus size={14} aria-hidden /> New
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input className="input" placeholder="New category name" value={newCat} onChange={(e) => setNewCat(e.target.value)} autoFocus aria-label="New category name" maxLength={40} />
                  <button type="button" className="btn-solid-pu shrink-0" onClick={addCategory} disabled={catBusy}>{catBusy ? <Spinner className="h-3 w-3" /> : 'Add'}</button>
                  <button type="button" className="btn-outline-pu shrink-0" onClick={() => setNewCat(null)}>Cancel</button>
                </div>
              )}
              {err('categoryId')}
            </div>
            <div>
              <label className="label" htmlFor="if-description">Description <span className="font-normal normal-case text-slate-400">({form.description.length}/300)</span></label>
              <textarea {...field('description')} className="input min-h-16" value={form.description} onChange={(e) => set('description', e.target.value)} maxLength={300} />
              {err('description')}
            </div>
            <fieldset>
              <legend className="label">Food type *</legend>
              <div className="flex gap-4 text-sm">
                {[true, false].map((v) => (
                  <label key={String(v)} className="inline-flex items-center gap-2">
                    <input type="radio" name="isVeg" checked={form.isVeg === v} onChange={() => set('isVeg', v)} />
                    {v ? 'Veg' : 'Non-veg'}
                  </label>
                ))}
              </div>
            </fieldset>
          </section>

          <section aria-label="Type and pricing" className="space-y-3">
            <fieldset>
              <legend className="label">Item type *</legend>
              <div className="inline-flex rounded-xl border border-slate-200 p-1" role="radiogroup">
                {(['PREPARED', 'PACKET'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={form.itemType === t}
                    onClick={() => set('itemType', t)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold ${form.itemType === t ? 'bg-pu-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    {t === 'PREPARED' ? 'Prepared fresh' : 'Packet product'}
                  </button>
                ))}
              </div>
              {editing && item.itemType === 'PACKET' && !packet ? (
                <p className="mt-1 text-xs text-amber-700">Switching to prepared removes this item&apos;s stock count.</p>
              ) : null}
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="if-price">Selling price (₹) *</label>
                <input {...field('price')} className="input" inputMode="numeric" value={form.price} onChange={(e) => set('price', e.target.value.replace(/\D/g, ''))} />
                {err('price')}
              </div>
              {packet ? (
                <div>
                  <label className="label" htmlFor="if-mrp">MRP (₹)</label>
                  <input {...field('mrp')} className="input" inputMode="numeric" value={form.mrp} onChange={(e) => set('mrp', e.target.value.replace(/\D/g, ''))} />
                  {err('mrp')}
                </div>
              ) : null}
            </div>
            {editing && form.price !== '' && Number(form.price) !== item.price ? (
              <p className="text-[11px] text-amber-700">Past orders keep the price they were placed at.</p>
            ) : null}
          </section>

          {packet ? (
            <section aria-label="Packet details" className="grid grid-cols-2 gap-3 rounded-xl bg-pu-50/60 p-3">
              <div>
                <label className="label" htmlFor="if-packSize">Pack size</label>
                <input {...field('packSize')} className="input" placeholder="52 g" value={form.packSize} onChange={(e) => set('packSize', e.target.value)} maxLength={30} />
                {err('packSize')}
              </div>
              <div>
                <label className="label" htmlFor="if-sku">SKU / barcode</label>
                <input {...field('sku')} className="input" value={form.sku} onChange={(e) => set('sku', e.target.value)} maxLength={40} />
                {err('sku')}
              </div>
              <div>
                <label className="label" htmlFor="if-stockQty">Stock quantity *</label>
                {editing && !switchingToPacket ? (
                  <div className="flex gap-2">
                    <input id="if-stockQty" className="input bg-slate-50" value={item.stockQty ?? 0} readOnly aria-describedby="if-stock-help" />
                    <button type="button" className="btn-outline-pu shrink-0" onClick={() => onAdjustStock(item)}>Adjust</button>
                  </div>
                ) : (
                  <input {...field('stockQty')} className="input" inputMode="numeric" value={form.stockQty} onChange={(e) => set('stockQty', e.target.value.replace(/\D/g, ''))} />
                )}
                {editing && !switchingToPacket ? <p id="if-stock-help" className="mt-1 text-[11px] text-slate-500">Use Adjust so every change has a reason.</p> : null}
                {err('stockQty')}
              </div>
              <div>
                <label className="label" htmlFor="if-lowStockThreshold">Low-stock alert at</label>
                <input {...field('lowStockThreshold')} className="input" inputMode="numeric" value={form.lowStockThreshold} onChange={(e) => set('lowStockThreshold', e.target.value.replace(/\D/g, ''))} />
                {err('lowStockThreshold')}
              </div>
              <div className="col-span-2">
                <label className="label" htmlFor="if-expiryDate">Best-before date</label>
                <input {...field('expiryDate')} type="date" className="input" value={form.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} />
                {err('expiryDate')}
              </div>
            </section>
          ) : null}

          <section aria-label="Visibility">
            <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
              <span>
                <span className="block text-sm font-semibold text-slate-800">Available for ordering</span>
                <span className="block text-[11px] text-slate-500">Packets also hide automatically at 0 stock.</span>
              </span>
              <input type="checkbox" role="switch" className="h-5 w-5 accent-pu-600" checked={form.isAvailable} onChange={(e) => set('isAvailable', e.target.checked)} />
            </label>
          </section>

          {formError ? <ErrorNote message={formError} /> : null}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-outline-pu" onClick={close}>Cancel</button>
            <button type="submit" className="btn-solid-pu" disabled={saving || uploading}>
              {saving ? <Spinner className="h-3.5 w-3.5" /> : null}
              {uploading ? 'Uploading photo…' : editing ? 'Save changes' : 'Add item'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

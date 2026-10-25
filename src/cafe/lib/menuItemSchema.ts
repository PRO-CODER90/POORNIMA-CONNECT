// One set of rules for the item form, shared by the browser form and the staff/admin APIs.
import { z } from 'zod';
import { isAllowedImageUrl } from '@/cafe/lib/stock';

const optInt = (min: number, max: number, label: string) =>
  z.preprocess(
    (v) => (v === '' || v === undefined ? null : v),
    z.coerce.number({ error: `${label} must be a number.` }).int(`${label} must be a whole number.`).min(min, `${label} must be at least ${min}.`).max(max, `${label} is too large.`).nullable(),
  );
const optText = (max: number, label: string) =>
  z.preprocess((v) => (typeof v === 'string' ? v.trim() || null : v ?? null), z.string().max(max, `${label} must be ${max} characters or fewer.`).nullable());

export const itemFields = z.object({
  name: z.string().trim().min(2, 'Item name must be at least 2 characters.').max(80, 'Item name must be 80 characters or fewer.'),
  categoryId: z.string().min(1, 'Choose a category.'),
  description: z.preprocess((v) => (typeof v === 'string' ? v.trim() : ''), z.string().max(300, 'Description must be 300 characters or fewer.')),
  itemType: z.enum(['PREPARED', 'PACKET'], { error: 'Choose an item type.' }),
  price: z.coerce.number({ error: 'Enter a price.' }).int('Price must be whole rupees.').min(1, 'Price must be at least ₹1.').max(100000, 'Price is too high.'),
  mrp: optInt(1, 100000, 'MRP'),
  isVeg: z.boolean(),
  packSize: optText(30, 'Pack size'),
  sku: z.preprocess(
    (v) => (typeof v === 'string' ? v.trim() || null : v ?? null),
    z.string().regex(/^[A-Za-z0-9_-]{1,40}$/, 'SKU can use letters, digits, - and _ (up to 40).').nullable(),
  ),
  stockQty: optInt(0, 100000, 'Stock quantity'),
  lowStockThreshold: z.coerce.number().int().min(0, 'Low-stock level cannot be negative.').max(1000, 'Low-stock level is too high.'),
  expiryDate: z.preprocess(
    (v) => (v === '' || v === undefined ? null : v),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date.').nullable(),
  ),
  imageUrl: z.preprocess(
    (v) => (v === '' || v === undefined ? null : v),
    z.string().refine(isAllowedImageUrl, 'Upload the photo here; outside links are not allowed.').nullable(),
  ),
  isAvailable: z.boolean(),
});

export type ItemInput = z.infer<typeof itemFields>;

/** Cross-field rules. `creating` decides whether a packet must carry its first stock count. */
export function checkItem(v: ItemInput, creating: boolean, today = new Date()): Record<string, string> {
  const e: Record<string, string> = {};
  if (v.itemType === 'PACKET') {
    if (creating && v.stockQty === null) e.stockQty = 'Enter how many packets you have.';
    if (v.mrp !== null && v.mrp < v.price) e.mrp = 'MRP cannot be lower than the selling price.';
  } else if (v.stockQty !== null && creating) {
    e.stockQty = 'Only packet products have a stock count.';
  }
  if (v.expiryDate) {
    const yearAgo = new Date(today.getTime() - 365 * 86_400_000).toISOString().slice(0, 10);
    if (v.expiryDate < yearAgo) e.expiryDate = 'Best-before date is more than a year ago.';
  }
  return e;
}

/** Parse + cross-check in one go. Returns either the clean value or field errors. */
export function parseItem(raw: unknown, creating: boolean): { ok: true; value: ItemInput } | { ok: false; errors: Record<string, string> } {
  const r = itemFields.safeParse(raw);
  if (!r.success) {
    const errors: Record<string, string> = {};
    for (const i of r.error.issues) errors[String(i.path[0] ?? 'form')] ??= i.message;
    return { ok: false, errors };
  }
  const errors = checkItem(r.data, creating);
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: r.data };
}

export const STOCK_REASONS = {
  add: ['RESTOCK'],
  remove: ['WASTAGE', 'EXPIRED', 'ADJUST'],
  set: ['ADJUST'],
} as const;

export const stockAdjustSchema = z
  .object({
    mode: z.enum(['add', 'remove', 'set']),
    qty: z.coerce.number().int('Quantity must be a whole number.').min(0).max(100000),
    reason: z.string(),
    note: z.preprocess((v) => (typeof v === 'string' ? v.trim() : ''), z.string().max(200)),
  })
  .superRefine((v, ctx) => {
    if (!(STOCK_REASONS[v.mode] as readonly string[]).includes(v.reason)) ctx.addIssue({ code: 'custom', path: ['reason'], message: 'Choose a reason.' });
    if (v.mode !== 'set' && v.qty < 1) ctx.addIssue({ code: 'custom', path: ['qty'], message: 'Enter at least 1.' });
    if (v.mode !== 'add' && !v.note) ctx.addIssue({ code: 'custom', path: ['note'], message: 'Add a short note for this change.' });
  });

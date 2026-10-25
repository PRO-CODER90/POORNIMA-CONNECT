// Packet stock rules and product images. Availability is DERIVED from stock, never copied into
// `isAvailable`, so a restock makes an item orderable again with no flag to flip back.
import { dayStart } from '@/cafe/lib/dates';

export type ItemType = 'PREPARED' | 'PACKET';
export type StockKind = 'NA' | 'OK' | 'LOW' | 'OUT' | 'EXPIRED';

export interface StockFields {
  itemType: string;
  stockQty: number | null;
  lowStockThreshold: number;
  expiryDate: Date | string | null;
}

export function stockState(i: StockFields, now: Date = new Date()): { kind: StockKind; qty: number | null } {
  if (i.itemType !== 'PACKET') return { kind: 'NA', qty: null };
  const q = Math.max(0, i.stockQty ?? 0);
  if (i.expiryDate && new Date(i.expiryDate) < dayStart(now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }))) {
    return { kind: 'EXPIRED', qty: q };
  }
  if (q <= 0) return { kind: 'OUT', qty: 0 };
  if (q <= i.lowStockThreshold) return { kind: 'LOW', qty: q };
  return { kind: 'OK', qty: q };
}

export function canOrder(i: StockFields & { isAvailable: boolean }, now?: Date): boolean {
  const k = stockState(i, now).kind;
  return i.isAvailable && k !== 'OUT' && k !== 'EXPIRED';
}

// ─── product images ───

export const DEMO_IMAGE_PREFIX = '/images/menu/demo/';
const DEMO_BY_CATEGORY: Record<string, string> = {
  SNACKS: 'snacks',
  BEVERAGES: 'beverages',
  'FAST FOOD': 'fast-food',
  MEALS: 'meals',
  DESSERTS: 'desserts',
};

/** The placeholder for a product: packets share one, prepared items get their category's. */
export function demoImageFor(categoryName?: string | null, itemType?: string | null): string {
  if (itemType === 'PACKET') return `${DEMO_IMAGE_PREFIX}packet.webp`;
  const key = DEMO_BY_CATEGORY[(categoryName ?? '').trim().toUpperCase()] ?? 'meals';
  return `${DEMO_IMAGE_PREFIX}${key}.webp`;
}

export const isDemoImage = (url: string | null | undefined) => !url || url.startsWith(DEMO_IMAGE_PREFIX);

/** Only our own uploads or the bundled demo images may be saved on an item. */
export function isAllowedImageUrl(url: string): boolean {
  if (/^\/images\/menu\/demo\/[a-z-]+\.webp$/.test(url)) return true;
  if (/^\/uploads\/menu\/[A-Za-z0-9-]+\/[0-9a-f-]{36}\.webp$/.test(url)) return true; // local dev driver
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname.endsWith('.public.blob.vercel-storage.com') && /^\/menu\//.test(u.pathname);
  } catch {
    return false;
  }
}

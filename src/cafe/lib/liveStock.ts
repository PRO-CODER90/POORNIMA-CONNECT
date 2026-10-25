// What students see of a menu item and its live stock. Pure (no database), so it is unit-tested.
import { createHash } from 'node:crypto';
import { canOrder, demoImageFor, stockState, type StockKind } from '@/cafe/lib/stock';

/** What a student sees for one menu item. Never SKU, MRP or stock history. */
export interface MenuItemDto {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  categoryId: string;
  isAvailable: boolean;
  itemType: string;
  isVeg: boolean;
  packSize: string | null;
  stock: LiveStock;
}

export interface LiveStock {
  state: StockKind;
  qty: number | null;
  available: boolean;
}

type MenuItemRow = {
  id: string; name: string; description: string; price: number; imageUrl: string | null; categoryId: string;
  isAvailable: boolean; itemType: string; isVeg: boolean; packSize: string | null; stockQty: number | null;
  lowStockThreshold: number; expiryDate: Date | null; category: { name: string };
};

export function liveStock(m: Pick<MenuItemRow, 'isAvailable' | 'itemType' | 'stockQty' | 'lowStockThreshold' | 'expiryDate'>): LiveStock {
  const s = stockState(m);
  return { state: s.kind, qty: s.qty, available: canOrder(m) };
}

export function toMenuItemDto(m: MenuItemRow): MenuItemDto {
  return {
    id: m.id, name: m.name, description: m.description, price: m.price,
    imageUrl: m.imageUrl || demoImageFor(m.category.name, m.itemType),
    categoryId: m.categoryId, isAvailable: m.isAvailable, itemType: m.itemType, isVeg: m.isVeg,
    packSize: m.packSize, stock: liveStock(m),
  };
}

/** Content hash of the stock map: unchanged stock gives the same ETag, so polls can be answered with 304. */
export function stockEtag(items: Record<string, LiveStock>): string {
  return `"${createHash('sha1').update(JSON.stringify(items)).digest('base64url').slice(0, 20)}"`;
}

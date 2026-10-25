// Endpoints the inventory screens talk to. Staff and admin use the same components with
// different URLs; staff URLs never carry a cafe id (the server takes it from the session).
export interface InventoryApi {
  list: string;
  create: string;
  item: (id: string) => string;
  restore: (id: string) => string;
  stock: (id: string) => string;
  movements: (id: string) => string;
  categories: string;
  upload: string;
}

export const staffInventoryApi: InventoryApi = {
  list: '/api/staff/inventory',
  create: '/api/staff/inventory',
  item: (id) => `/api/staff/inventory/${id}`,
  restore: (id) => `/api/staff/inventory/${id}/restore`,
  stock: (id) => `/api/staff/inventory/${id}/stock`,
  movements: (id) => `/api/staff/inventory/${id}/movements`,
  categories: '/api/staff/categories',
  upload: '/api/staff/inventory/upload-image',
};

export function adminInventoryApi(cafeId: string): InventoryApi {
  return {
    list: `/api/admin/cafes/${cafeId}/menu`,
    create: `/api/admin/cafes/${cafeId}/menu`,
    item: (id) => `/api/admin/menu-items/${id}`,
    restore: (id) => `/api/admin/menu-items/${id}/restore`,
    stock: (id) => `/api/admin/menu-items/${id}/stock`,
    movements: (id) => `/api/admin/menu-items/${id}/movements`,
    categories: `/api/admin/cafes/${cafeId}/categories`,
    upload: `/api/admin/cafes/${cafeId}/upload-image`,
  };
}

export type CallResult<T> = { ok: true; data: T } | { ok: false; error: string; fields?: Record<string, string> };

/** JSON request that never throws; turns any error body into a readable message. */
export async function call<T>(url: string, init?: { method?: string; body?: unknown }): Promise<CallResult<T>> {
  try {
    const r = await fetch(url, {
      method: init?.method ?? 'GET',
      cache: 'no-store',
      headers: init?.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: d.error ?? d.message ?? 'Something went wrong. Please try again.', fields: d.fields };
    return { ok: true, data: d as T };
  } catch {
    return { ok: false, error: 'Network error. Check your connection and try again.' };
  }
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  itemType: 'PREPARED' | 'PACKET' | string;
  price: number;
  mrp: number | null;
  isVeg: boolean;
  packSize: string | null;
  sku: string | null;
  stockQty: number | null;
  lowStockThreshold: number;
  expiryDate: string | null;
  imageUrl: string;
  isDemoImage: boolean;
  isAvailable: boolean;
  isActive: boolean;
  stock: 'NA' | 'OK' | 'LOW' | 'OUT' | 'EXPIRED';
  updatedAt: string;
}

export interface InventoryData {
  items: InventoryItem[];
  categories: { id: string; name: string }[];
  counts: { total: number; packetsInStock: number; low: number; out: number };
}

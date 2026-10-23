// Pure order-domain logic (unit-tested).

export const ORDER_STATUSES = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ['PENDING', 'PAID'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ORDER_FLOW: Record<OrderStatus, OrderStatus[]> = {
  PLACED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return (ORDER_FLOW[from] ?? []).includes(to);
}

/** Staff action name -> target status. */
export const STAFF_ACTIONS: Record<string, OrderStatus> = {
  accept: 'ACCEPTED',
  preparing: 'PREPARING',
  ready: 'READY',
  completed: 'COMPLETED',
};

/** Students may cancel only while the order is still PLACED (spec §79). */
export function studentMayCancel(status: OrderStatus): boolean {
  return status === 'PLACED';
}

/** Staff/admin may cancel until the order is completed. */
export function staffMayCancel(status: OrderStatus): boolean {
  return status !== 'COMPLETED' && status !== 'CANCELLED';
}

export interface PriceLine {
  menuItemId: string;
  name: string;
  price: number; // DB price
  qty: number;
}

export interface CalcResult {
  lines: (PriceLine & { subtotal: number })[];
  total: number;
  itemCount: number;
}

/**
 * Server-side price calculation (spec §66): prices always come from the
 * database; the client total is never trusted.
 */
export function calcTotals(lines: PriceLine[]): CalcResult {
  const merged = new Map<string, PriceLine & { subtotal: number }>();
  for (const l of lines) {
    if (!Number.isInteger(l.qty) || l.qty < 1 || l.qty > 99) {
      throw new Error(`Invalid quantity for ${l.name}`);
    }
    const existing = merged.get(l.menuItemId);
    const qty = (existing?.qty ?? 0) + l.qty;
    if (qty > 99) throw new Error(`Quantity for ${l.name} exceeds limit`);
    merged.set(l.menuItemId, { ...l, qty, subtotal: l.price * qty });
  }
  const out = [...merged.values()];
  return {
    lines: out,
    total: out.reduce((a, b) => a + b.subtotal, 0),
    itemCount: out.reduce((a, b) => a + b.qty, 0),
  };
}

/** Order number: PU-{cafeCode}-{YYYYMMDD}-{seq:4} e.g. PU-C1-20260927-0001 */
export function buildOrderNumber(cafeCode: string, dateKey: string, seq: number): string {
  const d = dateKey.replace(/-/g, '');
  return `PU-${cafeCode}-${d}-${String(seq).padStart(4, '0')}`;
}

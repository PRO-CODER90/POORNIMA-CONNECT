// Atomic stock SQL. Takes a plain query function so the same statements run inside a Prisma
// transaction in the app and against an in-process Postgres in the tests.
import { randomUUID } from 'node:crypto';

export type Q = (text: string, params: unknown[]) => Promise<Record<string, unknown>[]>;

export class StockError extends Error {}

export interface StockLine {
  menuItemId: string;
  quantity: number;
}

export interface StockChange {
  menuItemId: string;
  name: string;
  before: number;
  after: number;
  threshold: number;
}

async function move(q: Q, m: { menuItemId: string; cafeId: string; delta: number; qtyAfter: number; reason: string; orderId?: string | null; actorUserId?: string | null; note?: string }) {
  await q(
    `INSERT INTO "StockMovement" ("id","menuItemId","cafeId","delta","qtyAfter","reason","orderId","actorUserId","note")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [randomUUID(), m.menuItemId, m.cafeId, m.delta, m.qtyAfter, m.reason, m.orderId ?? null, m.actorUserId ?? null, m.note ?? ''],
  );
}

/**
 * Takes stock for the packet lines of an order. Each line is one conditional UPDATE (no
 * read-then-write), processed in id order so concurrent orders lock rows in the same order.
 * Throws StockError with a student-facing message if any line is short; the caller's
 * transaction then rolls back every line.
 */
export async function deductStock(q: Q, cafeId: string, orderId: string, lines: StockLine[]): Promise<StockChange[]> {
  const out: StockChange[] = [];
  for (const l of [...lines].sort((a, b) => (a.menuItemId < b.menuItemId ? -1 : 1))) {
    const rows = await q(
      `UPDATE "MenuItem" SET "stockQty" = "stockQty" - $2, "updatedAt" = now()
        WHERE "id" = $1 AND "itemType" = 'PACKET' AND "isActive" AND "isAvailable" AND "stockQty" >= $2
        RETURNING "stockQty", "name", "lowStockThreshold"`,
      [l.menuItemId, l.quantity],
    );
    if (rows.length === 0) {
      const [cur] = await q(`SELECT "stockQty", "name", "itemType" FROM "MenuItem" WHERE "id" = $1`, [l.menuItemId]);
      if (cur && cur.itemType !== 'PACKET') continue; // prepared items carry no stock
      const left = Number(cur?.stockQty ?? 0);
      const name = String(cur?.name ?? 'This item');
      throw new StockError(left > 0 ? `Only ${left} left of ${name}.` : `${name} just sold out.`);
    }
    const after = Number(rows[0].stockQty);
    await move(q, { menuItemId: l.menuItemId, cafeId, delta: -l.quantity, qtyAfter: after, reason: 'SALE', orderId });
    out.push({ menuItemId: l.menuItemId, name: String(rows[0].name), before: after + l.quantity, after, threshold: Number(rows[0].lowStockThreshold) });
  }
  return out;
}

/**
 * Cancels an order and puts its packets back, exactly once: only the request whose guarded
 * status change succeeds restocks. Returns false if the order was already cancelled/completed.
 */
export async function cancelAndRestock(q: Q, orderId: string, cancelReason: string): Promise<boolean> {
  const moved = await q(
    `UPDATE "Order" SET "orderStatus" = 'CANCELLED', "cancelReason" = $2, "updatedAt" = now()
      WHERE "id" = $1 AND "orderStatus" NOT IN ('CANCELLED','COMPLETED') RETURNING "cafeId"`,
    [orderId, cancelReason],
  );
  if (moved.length !== 1) return false;
  const cafeId = String(moved[0].cafeId);
  const lines = await q(`SELECT "menuItemId", SUM("quantity")::int AS qty FROM "OrderItem" WHERE "orderId" = $1 GROUP BY 1 ORDER BY 1`, [orderId]);
  for (const li of lines) {
    const [r] = await q(
      `UPDATE "MenuItem" SET "stockQty" = "stockQty" + $2, "updatedAt" = now()
        WHERE "id" = $1 AND "itemType" = 'PACKET' RETURNING "stockQty"`,
      [li.menuItemId, li.qty],
    );
    if (r) await move(q, { menuItemId: String(li.menuItemId), cafeId, delta: Number(li.qty), qtyAfter: Number(r.stockQty), reason: 'CANCEL_RESTOCK', orderId });
  }
  return true;
}

export type AdjustMode = 'add' | 'remove' | 'set';

/** Staff/admin stock change with a reason; every change leaves a movement record. */
export async function adjustStock(
  q: Q,
  a: { menuItemId: string; cafeId: string; mode: AdjustMode; qty: number; reason: string; note: string; actorUserId: string | null },
): Promise<{ before: number; after: number }> {
  const [cur] = await q(`SELECT "stockQty" FROM "MenuItem" WHERE "id" = $1 AND "cafeId" = $2 AND "itemType" = 'PACKET' FOR UPDATE`, [a.menuItemId, a.cafeId]);
  if (!cur) throw new StockError('Only packet products have stock.');
  const before = Number(cur.stockQty ?? 0);
  const delta = a.mode === 'add' ? a.qty : a.mode === 'remove' ? -a.qty : a.qty - before;
  if (before + delta < 0) throw new StockError(`Only ${before} in stock; cannot remove ${a.qty}.`);
  const [r] = await q(`UPDATE "MenuItem" SET "stockQty" = "stockQty" + $2, "updatedAt" = now() WHERE "id" = $1 RETURNING "stockQty"`, [a.menuItemId, delta]);
  const after = Number(r.stockQty);
  if (delta !== 0) await move(q, { menuItemId: a.menuItemId, cafeId: a.cafeId, delta, qtyAfter: after, reason: a.reason, actorUserId: a.actorUserId, note: a.note });
  return { before, after };
}

/** First stock for a new packet (or an item switched to packet). */
export async function recordInitialStock(q: Q, m: { menuItemId: string; cafeId: string; qty: number; actorUserId: string | null }) {
  await move(q, { menuItemId: m.menuItemId, cafeId: m.cafeId, delta: m.qty, qtyAfter: m.qty, reason: 'INITIAL', actorUserId: m.actorUserId });
}

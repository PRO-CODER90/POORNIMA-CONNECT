import { Prisma } from '@prisma/client';
import { prisma } from '@/cafe/lib/db';
import { ApiError, badRequest, conflict, forbidden, notFound } from '@/cafe/lib/api';
import { assertStaffCafe, requireAdmin, requireStaff, type AuthedStaff, type AuthedStudent } from '@/cafe/lib/rbac';
import { audit } from '@/cafe/lib/audit';
import { notify, notifyCafeStaff } from '@/cafe/lib/notify';
import { cafeOpenState } from '@/cafe/lib/cafe';
import { dateKey, dayEnd, dayStart, validateDateKey } from '@/cafe/lib/dates';
import {
  buildOrderNumber,
  calcTotals,
  canTransition,
  STAFF_ACTIONS,
  studentMayCancel,
  staffMayCancel,
  type OrderStatus,
} from '@/cafe/lib/orders';
import { inr } from '@/cafe/lib/money';
import { canOrder, demoImageFor } from '@/cafe/lib/stock';
import { cancelAndRestock, deductStock, StockError, type Q, type StockChange } from '@/cafe/lib/stockSql';

/** Runs stock SQL inside a Prisma transaction. */
export const prismaQ = (tx: Prisma.TransactionClient): Q => (text, params) => tx.$queryRawUnsafe(text, ...params);

// ─────────────────────────────── shared shapes ───────────────────────────────

export interface OrderItemDto {
  id: string;
  name: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderDto {
  id: string;
  orderNumber: string;
  cafe: { id: string; code: string; name: string };
  student: { name: string; studentCode: string } | null;
  items: OrderItemDto[];
  totalAmount: number;
  itemCount: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  cancelReason: string | null;
  createdAt: string;
  acceptedAt: string | null;
  preparingAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
  paidAt: string | null;
  paidByStaff: string | null;
}

export function toOrderDto(o: {
  id: string;
  orderNumber: string;
  totalAmount: number;
  itemCount: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  cancelReason: string | null;
  createdAt: Date;
  acceptedAt: Date | null;
  preparingAt: Date | null;
  readyAt: Date | null;
  completedAt: Date | null;
  paidAt: Date | null;
  cafe: { id: string; code: string; name: string };
  student?: { name: string; studentCode: string } | null;
  items: Array<{ id: string; menuItemId: string; itemName: string; imageUrl: string | null; quantity: number; unitPrice: number; subtotal: number }>;
  paidByStaff?: { name: string } | null;
}): OrderDto {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    cafe: o.cafe,
    student: o.student ?? null,
    items: o.items.map((i) => ({
      id: i.id,
      name: i.itemName,
      imageUrl: i.imageUrl,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      subtotal: i.subtotal,
    })),
    totalAmount: o.totalAmount,
    itemCount: o.itemCount,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    orderStatus: o.orderStatus,
    cancelReason: o.cancelReason,
    createdAt: o.createdAt.toISOString(),
    acceptedAt: o.acceptedAt?.toISOString() ?? null,
    preparingAt: o.preparingAt?.toISOString() ?? null,
    readyAt: o.readyAt?.toISOString() ?? null,
    completedAt: o.completedAt?.toISOString() ?? null,
    paidAt: o.paidAt?.toISOString() ?? null,
    paidByStaff: o.paidByStaff?.name ?? null,
  };
}

export const orderInclude = {
  cafe: { select: { id: true, code: true, name: true, coverEmoji: true } },
  student: { select: { name: true, studentCode: true } },
  items: { select: { id: true, menuItemId: true, itemName: true, imageUrl: true, quantity: true, unitPrice: true, subtotal: true } },
  paidByStaff: { select: { name: true } },
} satisfies Prisma.OrderInclude;

// ─────────────────────────────── order creation ───────────────────────────────

export interface CartLine {
  menuItemId: string;
  quantity: number;
}

/**
 * Place an order (spec §67): single DB transaction validates the student,
 * cafe, items, availability and prices, computes totals server-side,
 * writes order + items + notifications, and rolls back on any failure.
 * The client-sent total is NEVER used.
 */
export async function createOrder(student: AuthedStudent, rawLines: unknown) {
  const lines: CartLine[] = z_like(rawLines);
  if (lines.length === 0) throw badRequest('Your cart is empty.');

  for (let attempt = 0; attempt < 3; attempt++) {
    let stockChanges: StockChange[] = [];
    try {
      const dto = await prisma.$transaction(async (tx) => {
        const menuItems = await tx.menuItem.findMany({
          where: { id: { in: lines.map((l) => l.menuItemId) }, isActive: true },
          include: { category: { select: { name: true } }, cafe: { select: { id: true, code: true, name: true, openingTime: true, closingTime: true, manualStatus: true, isActive: true } } },
        });
        if (menuItems.length !== new Set(lines.map((l) => l.menuItemId)).size) {
          throw badRequest('One or more items no longer exist.');
        }

        const cafe = menuItems[0].cafe;
        if (!menuItems.every((m) => m.cafeId === cafe.id)) {
          throw badRequest('Your cart contains items from multiple cafes. Please order from one cafe at a time.');
        }
        if (cafeOpenState(cafe) !== 'OPEN') {
          throw conflict(`${cafe.name} is currently closed. Please try again during opening hours.`);
        }

        for (const m of menuItems) {
          if (!canOrder(m)) throw conflict(m.isAvailable ? `${m.name} just sold out.` : `${m.name} is currently unavailable.`);
        }

        const calc = calcTotals(
          menuItems.map((m) => ({ menuItemId: m.id, name: m.name, price: m.price, qty: lines.find((l) => l.menuItemId === m.id)!.quantity })),
        );

        const now = new Date();
        const dk = dateKey(now);
        // Collision-proof numbering: take the max existing sequence for this cafe+day
        // (order count would break if numbers have gaps or orders are back-/forward-dated).
        const prefix = buildOrderNumber(cafe.code, dk, 0).slice(0, -4); // e.g. "PU-C1-20260927-"
        const existing = await tx.order.findMany({
          where: { cafeId: cafe.id, orderNumber: { startsWith: prefix } },
          select: { orderNumber: true },
        });
        let maxSeq = 0;
        for (const e of existing) {
          const n = Number.parseInt(e.orderNumber.slice(prefix.length), 10);
          if (Number.isFinite(n) && n > maxSeq) maxSeq = n;
        }
        const orderNumber = buildOrderNumber(cafe.code, dk, maxSeq + 1);

        const order = await tx.order.create({
          data: {
            orderNumber,
            studentId: student.student.id,
            cafeId: cafe.id,
            totalAmount: calc.total,
            itemCount: calc.itemCount,
            paymentMethod: 'CASH',
            paymentStatus: 'PENDING',
            orderStatus: 'PLACED',
            items: {
              create: calc.lines.map((l) => {
                const m = menuItems.find((mi) => mi.id === l.menuItemId)!;
                return {
                  menuItemId: m.id,
                  itemName: m.name,
                  imageUrl: m.imageUrl || demoImageFor(m.category.name, m.itemType),
                  quantity: l.qty,
                  unitPrice: l.price,
                  subtotal: l.subtotal,
                };
              }),
            },
          },
          include: orderInclude,
        });

        // Same transaction as the order: a short packet line rolls the whole order back.
        const packets = menuItems.filter((m) => m.itemType === 'PACKET').map((m) => ({ menuItemId: m.id, quantity: lines.find((l) => l.menuItemId === m.id)!.quantity }));
        try {
          stockChanges = await deductStock(prismaQ(tx), cafe.id, order.id, packets);
        } catch (e) {
          if (e instanceof StockError) throw conflict(e.message);
          throw e;
        }

        await tx.auditLog.create({
          data: {
            userId: student.session.id,
            action: 'ORDER_CREATED',
            entityType: 'Order',
            entityId: order.id,
            metadata: JSON.stringify({ orderNumber, total: calc.total, cafeId: cafe.id }),
          },
        });

        return toOrderDto(order);
      }, { timeout: 8000 });
    // Notify AFTER the commit — notifications are best-effort and must never
    // hold the write lock inside the transaction (SQLite deadlock) or roll back
    // an order because a notification insert failed.
    await notifyCafeStaff(
      dto.cafe.id,
      '🔔 NEW ORDER',
      `New order ${dto.orderNumber} from ${dto.student?.name ?? 'a student'} (${dto.student?.studentCode ?? '—'}) — ${dto.itemCount} item(s), ${inr(dto.totalAmount)} CASH (pending).`,
    );
    await notifyStockCrossings(dto.cafe.id, stockChanges);
    return dto;
    } catch (e) {
      // Retry on order-number collision (two orders racing in the same second).
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002' && attempt < 2) continue;
      throw e;
    }
  }
  throw new ApiError(500, 'Could not create order. Please try again.');
}

// Tiny validator to avoid pulling zod into the hot path for this one call.
function z_like(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) throw badRequest('Cart must be a list of items.');
  const out: CartLine[] = [];
  const seen = new Set<string>();
  for (const r of raw.slice(0, 50)) {
    if (typeof r !== 'object' || r === null) throw badRequest('Invalid cart item.');
    const { menuItemId, quantity } = r as Record<string, unknown>;
    if (typeof menuItemId !== 'string' || seen.has(menuItemId)) throw badRequest('Invalid cart item.');
    seen.add(menuItemId);
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) throw badRequest('Invalid quantity.');
    out.push({ menuItemId, quantity: qty });
  }
  return out;
}

// ─────────────────────────────── ownership / access ───────────────────────────────

export async function getStudentOrder(student: AuthedStudent, orderId: string): Promise<OrderDto> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, studentId: student.student.id },
    include: orderInclude,
  });
  // 404 (not 403) so existence of other students' orders is not leaked.
  if (!order) throw notFound('Order not found.');
  return toOrderDto(order);
}

export async function listStudentOrders(student: AuthedStudent, q: URLSearchParams) {
  const where: Prisma.OrderWhereInput = { studentId: student.student.id };
  const range = q.get('range');
  const fromKey = validateDateKey(q.get('from') ?? '');
  const toKey = validateDateKey(q.get('to') ?? '');
  if (range === 'today') {
    where.createdAt = { gte: dayStart(), lte: dayEnd() };
  } else if (range === 'week') {
    where.createdAt = { gte: new Date(dayStart().getTime() - 6 * 86_400_000), lte: dayEnd() };
  } else if (range === 'month') {
    where.createdAt = { gte: new Date(`${dateKey().slice(0, 7)}-01T00:00:00+05:30`), lte: dayEnd() };
  } else if (fromKey || toKey) {
    const conds: Prisma.DateTimeFilter = {};
    if (fromKey) conds.gte = dayStart(fromKey);
    if (toKey) conds.lte = dayEnd(toKey);
    where.createdAt = conds;
  }
  const orders = await prisma.order.findMany({
    where,
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return orders.map(toOrderDto);
}

// ─────────────────────────────── cancellation ───────────────────────────────

export async function cancelOrder(orderId: string, reason: string | undefined, actor: { kind: 'student'; ctx: AuthedStudent } | { kind: 'staff'; ctx: AuthedStaff } | { kind: 'admin'; ctx: { session: { id: string } } }) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { cafe: { select: { id: true } } } });
  if (!order) throw notFound('Order not found.');

  const os = order.orderStatus as OrderStatus;
  if (actor.kind === 'student') {
    if (order.studentId !== actor.ctx.student.id) throw notFound('Order not found.');
    if (!studentMayCancel(os)) throw forbidden('This order can no longer be cancelled. It has already been accepted or is in progress.');
  } else if (actor.kind === 'staff') {
    assertStaffCafe(actor.ctx.staff, order.cafeId);
    if (!staffMayCancel(os)) throw forbidden('This order is already completed.');
  } else {
    if (!staffMayCancel(os)) throw forbidden('This order is already completed.');
  }

  const cancelReason = reason ?? (actor.kind === 'student' ? 'Cancelled by student' : 'Cancelled by staff/admin');
  // The guarded status change and the restock commit together, so stock comes back exactly once.
  const done = await prisma.$transaction((tx) => cancelAndRestock(prismaQ(tx), orderId, cancelReason));
  if (!done) throw conflict('This order was already cancelled or completed.');
  const updated = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude });
  await audit(actor.kind === 'student' ? actor.ctx.session.id : actor.kind === 'staff' ? actor.ctx.staff.userId : actor.ctx.session.id, 'ORDER_CANCELLED', 'Order', orderId, { reason: updated.cancelReason });
  if (actor.kind === 'student') {
    await notifyStudentUpdate(orderId, 'Order cancelled', `Your order ${updated.orderNumber} was cancelled. ${updated.cancelReason ?? ''}`.trim());
  }
  await notifyCafeStaff(order.cafeId, 'Order cancelled', `Order ${updated.orderNumber} was cancelled. ${updated.cancelReason ?? ''}`.trim());
  return toOrderDto(updated);
}

export async function notifyStudentUpdate(orderId: string, title: string, message: string, type: 'ORDER' | 'PAYMENT' = 'ORDER') {
  const userId = await notify_studentUserId(orderId);
  if (userId) await notify(userId, title, message, type);
}

async function notify_studentUserId(orderId: string): Promise<string | null> {
  const o = await prisma.order.findUnique({ where: { id: orderId }, select: { student: { select: { userId: true } } } });
  return o?.student?.userId ?? null;
}

// ─────────────────────────────── staff status transitions ───────────────────────────────

export async function advanceOrder(staff: AuthedStaff, orderId: string, action: string) {
  const target = STAFF_ACTIONS[action];
  if (!target) throw badRequest('Unknown action.');

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { cafe: { select: { id: true } } } });
  if (!order) throw notFound('Order not found.');
  assertStaffCafe(staff.staff, order.cafeId);
  if (!canTransition(order.orderStatus as OrderStatus, target)) {
    throw conflict(`Cannot move order from ${order.orderStatus} to ${target}.`);
  }

  const data: Record<string, unknown> = { orderStatus: target };
  if (target === 'ACCEPTED') data.acceptedAt = new Date();
  if (target === 'PREPARING') data.preparingAt = new Date();
  if (target === 'READY') data.readyAt = new Date();
  if (target === 'COMPLETED') {
    data.completedAt = new Date();
    data.completedById = staff.staff.id;
  }

  const updated = await prisma.order.update({ where: { id: orderId }, data, include: orderInclude });
  await audit(staff.staff.userId, target === 'ACCEPTED' ? 'ORDER_ACCEPTED' : 'ORDER_STATUS_CHANGED', 'Order', orderId, { from: order.orderStatus, to: target });

  const msg =
    target === 'ACCEPTED'
      ? `Your order ${updated.orderNumber} has been accepted by the cafe staff.`
      : target === 'PREPARING'
        ? `Your order ${updated.orderNumber} is being prepared.`
        : target === 'READY'
          ? `Your order ${updated.orderNumber} is READY. Please collect it from the counter and pay ${inr(updated.totalAmount)} in cash.`
          : `Your order ${updated.orderNumber} has been completed. Thank you!`;
  await notifyStudentUpdate(orderId, `Order ${target.toLowerCase()}`, msg);
  return toOrderDto(updated);
}

// ─────────────────────────────── cash payment confirmation ───────────────────────────────

/** Staff confirms physical cash receipt (spec §22/§47). */
export async function markCashReceived(staff: AuthedStaff, orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { cafe: { select: { id: true } } } });
  if (!order) throw notFound('Order not found.');
  assertStaffCafe(staff.staff, order.cafeId);
  if (order.orderStatus === 'CANCELLED') throw conflict('Cannot take payment for a cancelled order.');
  if (order.paymentStatus === 'PAID') throw conflict('Payment for this order was already recorded.');

  const updated = await prisma.$transaction(async (tx) => {
    await tx.payment.upsert({
      where: { orderId: order.id },
      create: { orderId: order.id, method: 'CASH', amount: order.totalAmount, status: 'PAID', receivedAt: new Date(), receivedByStaffId: staff.staff.id },
      update: { status: 'PAID', receivedAt: new Date(), receivedByStaffId: staff.staff.id },
    });
    return tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'PAID', paidAt: new Date(), paidByStaffId: staff.staff.id },
      include: orderInclude,
    });
  });

  await audit(staff.staff.userId, 'CASH_RECEIVED', 'Order', orderId, { amount: order.totalAmount });
  await notifyStudentUpdate(orderId, '🟢 Cash payment confirmed', `Payment of ${inr(order.totalAmount)} for order ${order.orderNumber} has been confirmed. Thank you!`, 'PAYMENT');
  return toOrderDto(updated);
}

/** Tells cafe staff when a sale takes a packet to its low-stock level or sells it out (only on the crossing). */
async function notifyStockCrossings(cafeId: string, changes: StockChange[]) {
  for (const c of changes) {
    if (c.after === 0) await notifyCafeStaff(cafeId, 'Out of stock', `${c.name} just sold out. Restock it in Inventory.`);
    else if (c.before > c.threshold && c.after <= c.threshold) await notifyCafeStaff(cafeId, 'Low stock', `${c.name}: only ${c.after} left.`);
  }
}

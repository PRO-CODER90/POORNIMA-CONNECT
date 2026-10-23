import { Prisma } from '@prisma/client';
import { prisma } from '@/cafe/lib/db';
import { dayEnd, dayStart, validateDateKey } from '@/cafe/lib/dates';
import type { AuthedAdmin } from '@/cafe/lib/rbac';
import { orderInclude, toOrderDto } from '../orders';

/**
 * ALL orders across all cafes with filters (spec §32).
 * Admin-only; no cafe scoping applies.
 */
export async function adminOrders(admin: AuthedAdmin, q: URLSearchParams) {
  const where: Prisma.OrderWhereInput = {};
  const cafeId = q.get('cafe');
  if (cafeId) where.cafeId = cafeId;

  const studentQ = (q.get('student') ?? '').trim();
  if (studentQ) {
    where.student = {
      OR: [
        { name: { contains: studentQ } },
        { studentCode: { contains: studentQ.toUpperCase() } },
        { email: { contains: studentQ.toLowerCase() } },
      ],
    };
  }

  const fromKey = validateDateKey(q.get('from') ?? '');
  const toKey = validateDateKey(q.get('to') ?? '');
  if (fromKey || toKey) {
    const conds: Prisma.DateTimeFilter = {};
    if (fromKey) conds.gte = dayStart(fromKey);
    if (toKey) conds.lte = dayEnd(toKey);
    where.createdAt = conds;
  }

  const payment = q.get('payment');
  if (payment === 'PENDING' || payment === 'PAID') where.paymentStatus = payment;
  const status = q.get('status');
  if (status) where.orderStatus = status;

  const itemQ = (q.get('item') ?? '').trim();
  if (itemQ) {
    where.items = { some: { itemName: { contains: itemQ } } };
  }
  const categoryQ = (q.get('category') ?? '').trim();
  if (categoryQ) {
    where.items = {
      some: { itemName: { contains: itemQ } , menuItem: { category: { name: { contains: categoryQ } } } },
    };
  }

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
      take: 100,
      skip: 0,
    }),
  ]);

  return { total, orders: orders.map(toOrderDto) };
}

/** Full order detail for admin (items, timeline, payment). */
export async function adminOrderDetail(admin: AuthedAdmin, orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      ...orderInclude,
      payment: true,
      completedBy: { select: { name: true, staffCode: true } },
    },
  });
  if (!order) return null;
  return {
    ...toOrderDto(order),
    payment: order.payment
      ? { method: order.payment.method, amount: order.payment.amount, status: order.payment.status, receivedAt: order.payment.receivedAt?.toISOString() ?? null }
      : null,
    completedBy: order.completedBy?.name ?? null,
  };
}

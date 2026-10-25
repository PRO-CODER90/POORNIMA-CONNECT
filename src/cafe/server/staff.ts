import { Prisma } from '@prisma/client';
import { prisma } from '@/cafe/lib/db';
import { assertStaffCafe, type AuthedStaff } from '@/cafe/lib/rbac';
import { dateKey, dayEnd, dayStart } from '@/cafe/lib/dates';
import { inr } from '@/cafe/lib/money';
import { reconcileCash, type CashRecon } from '@/cafe/lib/revenue';
import { orderInclude, toOrderDto } from './orders';
import { audit } from '@/cafe/lib/audit';
import { cafeOpenState } from '@/cafe/lib/cafe';

/** Staff dashboard stats — strictly scoped to the staff member's cafe. */
export async function staffDashboard(staff: AuthedStaff) {
  assertStaffCafe(staff.staff, staff.staff.assignedCafeId); // defense in depth
  const cafeId = staff.staff.assignedCafeId;
  const { from, to } = { from: dayStart(), to: dayEnd() };

  const [newOrders, preparing, ready, completedToday, allToday, pendingPayment] = await Promise.all([
    prisma.order.findMany({ where: { cafeId, orderStatus: 'PLACED' }, include: orderInclude, orderBy: { createdAt: 'desc' }, take: 30 }),
    prisma.order.findMany({ where: { cafeId, orderStatus: 'PREPARING' }, include: orderInclude, orderBy: { preparingAt: 'desc' }, take: 30 }),
    prisma.order.findMany({ where: { cafeId, orderStatus: 'READY' }, include: orderInclude, orderBy: { readyAt: 'desc' }, take: 30 }),
    prisma.order.findMany({ where: { cafeId, orderStatus: 'COMPLETED', createdAt: { gte: from, lte: to } }, include: orderInclude, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.order.findMany({ where: { cafeId, createdAt: { gte: from, lte: to } }, select: { totalAmount: true, orderStatus: true, paymentStatus: true }, take: 1000 }),
    prisma.order.findMany({ where: { cafeId, paymentStatus: 'PENDING', orderStatus: { notIn: ['CANCELLED', 'COMPLETED'] } }, include: orderInclude, orderBy: { createdAt: 'desc' }, take: 50 }),
  ]);

  const recon: CashRecon = reconcileCash(allToday);

  return {
    cafe: { id: staff.cafe.id, code: staff.cafe.code, name: staff.cafe.name },
    staff: { name: staff.staff.name, staffCode: staff.staff.staffCode },
    stats: {
      newOrders: newOrders.length,
      preparing: preparing.length,
      ready: ready.length,
      completedToday: completedToday.length,
      salesToday: recon.collectedCash + recon.pendingCash, // valid (non-cancelled) today
      collectedToday: recon.collectedCash,
      pendingCash: recon.pendingCash,
    },
    newOrders: newOrders.map(toOrderDto),
    preparing: preparing.map(toOrderDto),
    ready: ready.map(toOrderDto),
    completedToday: completedToday.map(toOrderDto),
    pendingPayment: pendingPayment.map(toOrderDto),
  };
}

export type StaffOrderFilter = 'new' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'paypending' | 'all';

/** Staff order list — the cafe filter ALWAYS comes from the session, never the query. */
export async function staffOrders(staff: AuthedStaff, filter: string, search: string | null) {
  const cafeId = staff.staff.assignedCafeId;
  const where: Prisma.OrderWhereInput = { cafeId };
  const today = { gte: dayStart(), lte: dayEnd() };
  switch (filter as StaffOrderFilter) {
    case 'new': where.orderStatus = 'PLACED'; break;
    case 'accepted': where.orderStatus = 'ACCEPTED'; break;
    case 'preparing': where.orderStatus = 'PREPARING'; break;
    case 'ready': where.orderStatus = 'READY'; break;
    case 'completed': where.orderStatus = 'COMPLETED'; where.createdAt = today; break;
    case 'cancelled': where.orderStatus = 'CANCELLED'; break;
    case 'paypending': where.paymentStatus = 'PENDING'; where.orderStatus = { not: 'CANCELLED' }; break;
    case 'all':
    default:
      where.createdAt = today;
  }
  if (search) {
    const s = search.trim();
    where.OR = [
      { orderNumber: { contains: s } },
      { student: { OR: [{ name: { contains: s } }, { studentCode: { contains: s.toUpperCase() } }] } },
    ];
  }
  const orders = await prisma.order.findMany({
    where,
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return { cafe: { id: cafeId, code: staff.cafe.code, name: staff.cafe.name }, orders: orders.map(toOrderDto) };
}

/** Staff cafe history (last N days) + simple sales summary. */
export async function staffHistory(staff: AuthedStaff, days = 7) {
  const cafeId = staff.staff.assignedCafeId;
  const from = new Date(dayStart().getTime() - (days - 1) * 86_400_000);
  const rows = await prisma.order.findMany({
    where: { cafeId, createdAt: { gte: from } },
    select: { createdAt: true, totalAmount: true, orderStatus: true, paymentStatus: true },
  });
  const recon = reconcileCash(rows);
  const byDay = new Map<string, { revenue: number; orders: number }>();
  for (const r of rows) {
    if (r.orderStatus === 'CANCELLED') continue;
    const k = dateKey(r.createdAt);
    const e = byDay.get(k) ?? { revenue: 0, orders: 0 };
    e.revenue += r.totalAmount;
    e.orders += 1;
    byDay.set(k, e);
  }
  const daily = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, v]) => ({ date, ...v }));
  return {
    recon: { ...recon, label: `Last ${days} days` },
    totalRevenue: inr(recon.expectedCash),
    daily,
  };
}

/** Staff open/close switch for their own cafe. null = follow the schedule (closed on Sundays). */
export async function staffSetCafeStatus(staff: AuthedStaff, manualStatus: unknown) {
  const cafeId = staff.staff.assignedCafeId; // always from the session, never the request
  const value = manualStatus === 'OPEN' || manualStatus === 'CLOSED' ? manualStatus : null;
  const cafe = await prisma.cafe.update({ where: { id: cafeId }, data: { manualStatus: value } });
  await audit(staff.session.id, 'CAFE_UPDATED', 'Cafe', cafeId, { manualStatus: value });
  return { manualStatus: cafe.manualStatus, status: cafeOpenState(cafe) };
}

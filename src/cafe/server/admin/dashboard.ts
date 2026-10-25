import { Prisma } from '@prisma/client';
import { prisma } from '@/cafe/lib/db';
import { cafeOpenState } from '@/cafe/lib/cafe';
import { dateFilter, dateKey, dayEnd, dayStart, lastNDaysRange, thisMonthRange, todayRange } from '@/cafe/lib/dates';
import { inr } from '@/cafe/lib/money';
import { reconcileCash } from '@/cafe/lib/revenue';
import type { AuthedAdmin } from '@/cafe/lib/rbac';

/** University-wide dashboard (spec §29). */
export async function adminDashboard(_admin: AuthedAdmin) {
  const today = { gte: dayStart(), lte: dayEnd() };
  const [
    totalAgg,
    todayOrders,
    studentsServed,
    totalItems,
    activeCafes,
    cafes,
    last7,
  ] = await Promise.all([
    prisma.order.aggregate({ where: { orderStatus: { not: 'CANCELLED' } }, _sum: { totalAmount: true, itemCount: true } }),
    prisma.order.findMany({ where: { createdAt: today }, select: { id: true, totalAmount: true, orderStatus: true, paymentStatus: true, itemCount: true, cafeId: true, createdAt: true, studentId: true } }),
    prisma.student.count(),
    prisma.order.aggregate({ where: { orderStatus: { not: 'CANCELLED' } }, _sum: { itemCount: true } }),
    prisma.cafe.count({ where: { isActive: true } }),
    prisma.cafe.findMany({ orderBy: { code: 'asc' }, include: { staff: { select: { id: true } }, menuItems: { where: { isActive: true }, select: { id: true } } } }),
    prisma.order.findMany({ where: { createdAt: dateFilter(lastNDaysRange(7)), orderStatus: { not: 'CANCELLED' } }, select: { totalAmount: true, createdAt: true } }),
  ]);

  const todayRecon = reconcileCash(todayOrders);
  const paidToday = todayOrders.filter((o) => o.paymentStatus === 'PAID' && o.orderStatus !== 'CANCELLED').length;

  const todayByCafe = new Map<string, { orders: number; revenue: number; pending: number }>();
  for (const o of todayOrders) {
    const e = todayByCafe.get(o.cafeId) ?? { orders: 0, revenue: 0, pending: 0 };
    if (o.orderStatus !== 'CANCELLED') {
      e.orders += 1;
      e.revenue += o.totalAmount;
      if (o.paymentStatus !== 'PAID') e.pending += o.totalAmount;
    }
    todayByCafe.set(o.cafeId, e);
  }

  const last7Map = new Map<string, number>();
  for (const o of last7) {
    const k = dateKey(o.createdAt);
    last7Map.set(k, (last7Map.get(k) ?? 0) + o.totalAmount);
  }

  return {
    cards: {
      totalRevenue: totalAgg._sum?.totalAmount ?? 0,
      todayRevenue: todayRecon.expectedCash,
      todayCashCollected: todayRecon.collectedCash,
      todayOrders: todayRecon.validOrders,
      studentsServed,
      pendingCash: todayRecon.pendingCash,
      totalItemsSold: totalItems._sum?.itemCount ?? 0,
      activeCafes,
      paidOrdersToday: paidToday,
    },
    cafes: cafes.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      location: c.location,
      coverEmoji: c.coverEmoji,
      status: cafeOpenState(c),
      staffCount: c.staff.length,
      itemCount: c.menuItems.length,
      today: todayByCafe.get(c.id) ?? { orders: 0, revenue: 0, pending: 0 },
    })),
    revenueLast7: [...last7Map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => ({ date, value })),
  };
}

/** Cafe overview with today stats (spec §30/§41). */
export async function adminCafes(_admin: AuthedAdmin) {
  const today = { gte: dayStart(), lte: dayEnd() };
  const [cafes, todayOrders, totalAggs] = await Promise.all([
    prisma.cafe.findMany({ orderBy: { code: 'asc' } }),
    prisma.order.findMany({ where: { createdAt: today }, select: { cafeId: true, totalAmount: true, orderStatus: true, paymentStatus: true, itemCount: true } }),
    prisma.order.groupBy({
      by: ['cafeId'],
      where: { orderStatus: { not: 'CANCELLED' } },
      _sum: { totalAmount: true, itemCount: true },
      _count: { _all: true },
    }),
  ]);
  const tmap = new Map<string, { orders: number; revenue: number; pending: number; items: number }>();
  for (const o of todayOrders) {
    if (o.orderStatus === 'CANCELLED') continue;
    const e = tmap.get(o.cafeId) ?? { orders: 0, revenue: 0, pending: 0, items: 0 };
    e.orders += 1;
    e.revenue += o.totalAmount;
    e.items += o.itemCount;
    if (o.paymentStatus !== 'PAID') e.pending += o.totalAmount;
    tmap.set(o.cafeId, e);
  }
  const totals = new Map(totalAggs.map((a) => [a.cafeId, a]));
  return cafes.map((c) => {
    const t = tmap.get(c.id) ?? { orders: 0, revenue: 0, pending: 0, items: 0 };
    const tot = totals.get(c.id);
    return {
      id: c.id, code: c.code, name: c.name, location: c.location, coverEmoji: c.coverEmoji,
      openingTime: c.openingTime, closingTime: c.closingTime, isActive: c.isActive,
      status: cafeOpenState(c),
      today: t,
      allTime: { revenue: tot?._sum?.totalAmount ?? 0, orders: tot?._count._all ?? 0, items: tot?._sum?.itemCount ?? 0 },
    };
  });
}

/** Single cafe detail for admin (spec §31). */
export async function adminCafeDetail(_admin: AuthedAdmin, cafeId: string) {
  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    include: {
      staff: { include: { user: { select: { email: true, lastLogin: true } } } },
      menuItems: { where: { isActive: true } },
    },
  });
  if (!cafe) return null;

  const today = { gte: dayStart(), lte: dayEnd() };
  const [todayOrders, allOrders, itemAgg, catAgg, daily, monthly] = await Promise.all([
    prisma.order.findMany({ where: { cafeId, createdAt: today }, select: { totalAmount: true, orderStatus: true, paymentStatus: true, itemCount: true } }),
    prisma.order.findMany({ where: { cafeId }, select: { totalAmount: true, orderStatus: true, paymentStatus: true, createdAt: true, itemCount: true } }),
    prisma.orderItem.groupBy({ by: ['itemName'], where: { order: { cafeId, orderStatus: { not: 'CANCELLED' } } }, _sum: { subtotal: true, quantity: true }, orderBy: { _sum: { quantity: 'desc' } }, take: 8 }),
    prisma.orderItem.findMany({
      where: { order: { cafeId, orderStatus: { not: 'CANCELLED' } } },
      select: { subtotal: true, quantity: true, menuItem: { select: { category: { select: { name: true } } } } },
    }),
    prisma.order.findMany({ where: { cafeId, orderStatus: { not: 'CANCELLED' }, createdAt: dateFilter(lastNDaysRange(14)) }, select: { totalAmount: true, createdAt: true } }),
    prisma.order.findMany({ where: { cafeId, orderStatus: { not: 'CANCELLED' }, createdAt: { gte: new Date(Date.now() - 180 * 86_400_000) } }, select: { totalAmount: true, createdAt: true } }),
  ]);

  const catMap = new Map<string, { total: number; quantity: number }>();
  for (const r of catAgg) {
    const name = r.menuItem.category?.name ?? 'Other';
    const e = catMap.get(name) ?? { total: 0, quantity: 0 };
    e.total += r.subtotal;
    e.quantity += r.quantity;
    catMap.set(name, e);
  }

  const allRecon = reconcileCash(allOrders);
  const todayRecon = reconcileCash(todayOrders);

  const dayMap = new Map<string, number>();
  for (const o of daily) {
    const k = dateKey(o.createdAt);
    dayMap.set(k, (dayMap.get(k) ?? 0) + o.totalAmount);
  }
  const monthMap = new Map<string, number>();
  for (const o of monthly) {
    const k = dateKey(o.createdAt).slice(0, 7);
    monthMap.set(k, (monthMap.get(k) ?? 0) + o.totalAmount);
  }

  return {
    cafe: {
      id: cafe.id, code: cafe.code, name: cafe.name, description: cafe.description, location: cafe.location,
      coverEmoji: cafe.coverEmoji, imageUrl: cafe.imageUrl, openingTime: cafe.openingTime, closingTime: cafe.closingTime,
      manualStatus: cafe.manualStatus, isActive: cafe.isActive, status: cafeOpenState(cafe),
    },
    staff: cafe.staff.map((s) => ({ id: s.id, name: s.name, staffCode: s.staffCode, email: s.user.email, lastLogin: s.user.lastLogin?.toISOString() ?? null })),
    stats: {
      today: { orders: todayRecon.validOrders, revenue: todayRecon.expectedCash, collected: todayRecon.collectedCash, pending: todayRecon.pendingCash },
      allTime: { orders: allRecon.validOrders, revenue: allRecon.expectedCash, collected: allRecon.collectedCash, pending: allRecon.pendingCash, items: allOrders.filter((o) => o.orderStatus !== 'CANCELLED').reduce((a, o) => a + o.itemCount, 0) },
      itemCount: cafe.menuItems.length,
    },
    popularItems: itemAgg.map((i) => ({ name: i.itemName, quantity: i._sum?.quantity ?? 0, revenue: i._sum?.subtotal ?? 0 })),
    categorySales: [...catMap.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total),
    dailySales: [...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => ({ date, value })),
    monthlySales: [...monthMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, value]) => ({ month, value })),
  };
}

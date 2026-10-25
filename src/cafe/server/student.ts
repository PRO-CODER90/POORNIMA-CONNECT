import { Prisma } from '@prisma/client';
import { prisma } from '@/cafe/lib/db';
import { ApiError } from '@/cafe/lib/api';
import { audit } from '@/cafe/lib/audit';
import { cafeOpenState } from '@/cafe/lib/cafe';
import { dateFilter, dateKey, dayEnd, dayStart, lastNDaysRange, thisMonthRange, todayRange } from '@/cafe/lib/dates';
import { inr } from '@/cafe/lib/money';
import { requireStudent, type AuthedStudent } from '@/cafe/lib/rbac';
import { orderInclude, toOrderDto } from './orders';
import { canOrder } from '@/cafe/lib/stock';
import { liveStock, stockEtag, toMenuItemDto, type LiveStock, type MenuItemDto } from '@/cafe/lib/liveStock';

// ─────────────────────────────── cafes (student view) ───────────────────────────────

export interface CafeDto {
  id: string;
  code: string;
  name: string;
  description: string;
  location: string;
  coverEmoji: string;
  imageUrl: string | null;
  openingTime: string;
  closingTime: string;
  status: 'OPEN' | 'CLOSED';
  isActive: boolean;
  itemCount: number;
  availableCount: number;
}

export async function listCafesForStudent() {
  const cafes = await prisma.cafe.findMany({
    where: { isActive: true },
    orderBy: { code: 'asc' },
    include: {
      menuItems: { where: { isActive: true }, select: { id: true, isAvailable: true, itemType: true, stockQty: true, lowStockThreshold: true, expiryDate: true } },
    },
  });
  return cafes.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    description: c.description,
    location: c.location,
    coverEmoji: c.coverEmoji,
    imageUrl: c.imageUrl,
    openingTime: c.openingTime,
    closingTime: c.closingTime,
    status: cafeOpenState(c),
    isActive: c.isActive,
    itemCount: c.menuItems.length,
    availableCount: c.menuItems.filter((m) => canOrder(m)).length,
  })) satisfies CafeDto[];
}

export type { MenuItemDto, LiveStock } from '@/cafe/lib/liveStock';

export interface MenuCafeDto extends CafeDto {
  categories: { id: string; name: string; sortOrder: number }[];
  items: MenuItemDto[];
}

export async function getCafeWithMenu(cafeIdOrCode: string) {
  const cafe = await prisma.cafe.findFirst({
    where: { OR: [{ id: cafeIdOrCode }, { code: cafeIdOrCode.toUpperCase() }], isActive: true },
    include: {
      categories: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      menuItems: { where: { isActive: true }, include: { category: { select: { name: true } } }, orderBy: { createdAt: 'asc' } },
    },
  });
  if (!cafe) return null;
  const items = cafe.menuItems.map(toMenuItemDto);
  return {
    id: cafe.id, code: cafe.code, name: cafe.name, description: cafe.description,
    location: cafe.location, coverEmoji: cafe.coverEmoji, imageUrl: cafe.imageUrl,
    openingTime: cafe.openingTime, closingTime: cafe.closingTime,
    status: cafeOpenState(cafe), isActive: cafe.isActive,
    itemCount: items.length, availableCount: items.filter((i) => i.stock.available).length,
    categories: cafe.categories.map((c) => ({ id: c.id, name: c.name, sortOrder: c.sortOrder })),
    items,
  } satisfies MenuCafeDto;
}

/** Live stock + availability for one cafe's menu, with a content ETag so unchanged polls are 304s. */
export async function cafeStock(cafeIdOrCode: string): Promise<{ etag: string; body: { asOf: number; items: Record<string, LiveStock> } } | null> {
  const cafe = await prisma.cafe.findFirst({
    where: { OR: [{ id: cafeIdOrCode }, { code: cafeIdOrCode.toUpperCase() }], isActive: true },
    select: {
      menuItems: {
        where: { isActive: true },
        select: { id: true, isAvailable: true, itemType: true, stockQty: true, lowStockThreshold: true, expiryDate: true },
        orderBy: { id: 'asc' },
      },
    },
  });
  if (!cafe) return null;
  const items: Record<string, LiveStock> = {};
  for (const m of cafe.menuItems) items[m.id] = liveStock(m);
  return { etag: stockEtag(items), body: { asOf: Date.now(), items } };
}


// ─────────────────────────────── dashboard stats ───────────────────────────────

export async function studentDashboard(student: AuthedStudent) {
  const sid = student.student.id;
  const today = { gte: dayStart(), lte: dayEnd() };
  const [todayOrders, totalOrders, spendingAgg, recent] = await Promise.all([
    prisma.order.findMany({ where: { studentId: sid, createdAt: today }, select: { totalAmount: true, orderStatus: true, paymentStatus: true } }),
    prisma.order.count({ where: { studentId: sid, orderStatus: { not: 'CANCELLED' } } }),
    prisma.order.aggregate({
      where: { studentId: sid, orderStatus: { not: 'CANCELLED' } },
      _sum: { totalAmount: true },
    }),
    prisma.order.findMany({ where: { studentId: sid }, include: orderInclude, orderBy: { createdAt: 'desc' }, take: 5 }),
  ]);
  const validToday = todayOrders.filter((o) => o.orderStatus !== 'CANCELLED');
  return {
    student: { name: student.student.name, studentCode: student.student.studentCode, email: student.student.email },
    stats: {
      todaySpending: validToday.reduce((a, o) => a + o.totalAmount, 0),
      ordersToday: validToday.length,
      totalOrders,
      totalSpending: spendingAgg._sum?.totalAmount ?? 0,
    },
    recentOrders: recent.map(toOrderDto),
    cafes: await listCafesForStudent(),
  };
}

// ─────────────────────────────── spending ───────────────────────────────

export interface SpendingDto {
  summary: { today: number; week: number; month: number; total: number; ordersTotal: number };
  byCafe: { id: string; name: string; code: string; coverEmoji: string; total: number; orders: number }[];
  byCategory: { name: string; total: number; quantity: number }[];
  daily: { date: string; value: number }[];
  monthly: { month: string; value: number }[];
}

export async function studentSpending(student: AuthedStudent): Promise<SpendingDto> {
  const sid = student.student.id;
  const [todayR, weekR, monthR, totalAgg] = await Promise.all([
    prisma.order.aggregate({ where: { studentId: sid, orderStatus: { not: 'CANCELLED' }, createdAt: dateFilter(todayRange()) }, _sum: { totalAmount: true } }),
    prisma.order.aggregate({ where: { studentId: sid, orderStatus: { not: 'CANCELLED' }, createdAt: dateFilter(lastNDaysRange(7)) }, _sum: { totalAmount: true } }),
    prisma.order.aggregate({ where: { studentId: sid, orderStatus: { not: 'CANCELLED' }, createdAt: dateFilter(thisMonthRange()) }, _sum: { totalAmount: true } }),
    prisma.order.aggregate({ where: { studentId: sid, orderStatus: { not: 'CANCELLED' } }, _sum: { totalAmount: true }, _count: { _all: true } }),
  ]);

  const orders = await prisma.order.findMany({
    where: { studentId: sid, orderStatus: { not: 'CANCELLED' } },
    include: {
      cafe: { select: { id: true, name: true, code: true, coverEmoji: true } },
      items: { include: { menuItem: { select: { category: { select: { name: true } } } } } },
    },
  });

  const cafeMap = new Map<string, { id: string; name: string; code: string; coverEmoji: string; total: number; orders: number }>();
  const catMap = new Map<string, { total: number; quantity: number }>();
  const dayMap = new Map<string, number>();
  const monthMap = new Map<string, number>();

  for (const o of orders) {
    const ck = o.cafe.id;
    const c = cafeMap.get(ck) ?? { id: o.cafe.id, name: o.cafe.name, code: o.cafe.code, coverEmoji: o.cafe.coverEmoji, total: 0, orders: 0 };
    c.total += o.totalAmount;
    c.orders += 1;
    cafeMap.set(ck, c);

    for (const it of o.items) {
      const cn = it.menuItem.category?.name ?? 'Other';
      const e = catMap.get(cn) ?? { total: 0, quantity: 0 };
      e.total += it.subtotal;
      e.quantity += it.quantity;
      catMap.set(cn, e);
    }
    const dk = dateKey(o.createdAt);
    dayMap.set(dk, (dayMap.get(dk) ?? 0) + o.totalAmount);
    const mk = dk.slice(0, 7);
    monthMap.set(mk, (monthMap.get(mk) ?? 0) + o.totalAmount);
  }

  const monthlyKeys = [...monthMap.keys()].sort().slice(-6);
  return {
    summary: {
      today: todayR._sum?.totalAmount ?? 0,
      week: weekR._sum?.totalAmount ?? 0,
      month: monthR._sum?.totalAmount ?? 0,
      total: totalAgg._sum?.totalAmount ?? 0,
      ordersTotal: totalAgg._count._all,
    },
    byCafe: [...cafeMap.values()].sort((a, b) => b.total - a.total).map((c) => ({ ...c, total: c.total })),
    byCategory: [...catMap.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total),
    daily: [...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => ({ date, value })),
    monthly: monthlyKeys.map((month) => ({ month, value: monthMap.get(month)! })),
  };
}

// ─────────────────────────────── profile ───────────────────────────────

export async function updateProfile(student: AuthedStudent, data: { name?: string; email?: string; phone?: string }) {
  const payload: Prisma.StudentUpdateInput = {};
  if (data.name !== undefined) {
    const name = data.name.trim();
    if (name.length < 2 || name.length > 80) throw new ApiError(400, 'Name must be 2-80 characters.');
    payload.name = name;
  }
  if (data.email !== undefined) {
    const email = data.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'Enter a valid email address.');
    const clash = await prisma.student.findFirst({ where: { email, NOT: { id: student.student.id } } });
    if (clash) throw new ApiError(409, 'This email is already in use.');
    payload.email = email;
    payload.user = { update: { email } };
  }
  if (data.phone !== undefined) {
    const phone = data.phone.trim();
    if (phone && !/^[+]?[\d\s-]{8,15}$/.test(phone)) throw new ApiError(400, 'Enter a valid phone number.');
    payload.phone = phone || null;
  }
  const updated = await prisma.student.update({ where: { id: student.student.id }, data: payload });
  await audit(student.session.id, 'STUDENT_UPDATED', 'Student', student.student.id);
  return {
    id: updated.id, name: updated.name, email: updated.email, studentCode: updated.studentCode,
    department: updated.department, course: updated.course, year: updated.year, phone: updated.phone,
  };
}

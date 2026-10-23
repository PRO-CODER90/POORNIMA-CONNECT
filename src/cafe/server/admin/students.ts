import { prisma } from '@/cafe/lib/db';
import { dateFilter, lastNDaysRange, thisMonthRange, todayRange } from '@/cafe/lib/dates';
import type { AuthedAdmin } from '@/cafe/lib/rbac';
import { orderInclude, toOrderDto } from '../orders';

/** Student management list with aggregates (spec §33). */
export async function adminStudents(admin: AuthedAdmin, search: string | null) {
  void admin;
  const where = search
    ? {
        OR: [
          { studentCode: { contains: search.toUpperCase() } },
          { name: { contains: search } },
          { email: { contains: search.toLowerCase() } },
        ],
      }
    : {};

  const students = await prisma.student.findMany({
    where,
    include: {
      user: { select: { lastLogin: true, isActive: true } },
      orders: { select: { totalAmount: true, orderStatus: true, createdAt: true } },
    },
    orderBy: { studentCode: 'asc' },
    take: 500,
  });

  return students.map((s) => {
    const valid = s.orders.filter((o) => o.orderStatus !== 'CANCELLED');
    const last = s.orders.length ? s.orders.reduce((a, b) => (a.createdAt > b.createdAt ? a : b)) : null;
    return {
      id: s.id,
      studentCode: s.studentCode,
      name: s.name,
      email: s.email,
      course: s.course,
      department: s.department,
      year: s.year,
      phone: s.phone,
      status: (s.user.isActive ? 'ACTIVE' : 'INACTIVE') as 'ACTIVE' | 'INACTIVE',
      lastLogin: s.user.lastLogin?.toISOString() ?? null,
      totalOrders: valid.length,
      totalSpending: valid.reduce((a, o) => a + o.totalAmount, 0),
      lastOrderAt: last?.createdAt.toISOString() ?? null,
    };
  });
}

/** Admin view of an individual student — everything the student sees about themselves, plus history (spec §34). */
export async function adminStudentDetail(admin: AuthedAdmin, studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { user: { select: { email: true, lastLogin: true, isActive: true } } },
  });
  if (!student) return null;

  const [today, week, month, totalAgg, orders] = await Promise.all([
    prisma.order.aggregate({ where: { studentId, orderStatus: { not: 'CANCELLED' }, createdAt: dateFilter(todayRange()) }, _sum: { totalAmount: true } }),
    prisma.order.aggregate({ where: { studentId, orderStatus: { not: 'CANCELLED' }, createdAt: dateFilter(lastNDaysRange(7)) }, _sum: { totalAmount: true } }),
    prisma.order.aggregate({ where: { studentId, orderStatus: { not: 'CANCELLED' }, createdAt: dateFilter(thisMonthRange()) }, _sum: { totalAmount: true } }),
    prisma.order.aggregate({ where: { studentId, orderStatus: { not: 'CANCELLED' } }, _sum: { totalAmount: true }, _count: { _all: true } }),
    prisma.order.findMany({ where: { studentId }, include: orderInclude, orderBy: { createdAt: 'desc' }, take: 100 }),
  ]);

  const cafeMap = new Map<string, { id: string; name: string; code: string; coverEmoji: string; total: number; orders: number }>();
  const catMap = new Map<string, { total: number; quantity: number }>();
  for (const o of orders) {
    const c = cafeMap.get(o.cafeId) ?? { id: o.cafe.id, name: o.cafe.name, code: o.cafe.code, coverEmoji: o.cafe.coverEmoji, total: 0, orders: 0 };
    if (o.orderStatus !== 'CANCELLED') {
      c.total += o.totalAmount;
      c.orders += 1;
    }
    cafeMap.set(o.cafeId, c);
  }
  for (const o of orders) {
    if (o.orderStatus === 'CANCELLED') continue;
    for (const it of o.items) {
      const mi = await findCatName(it.menuItemId);
      const e = catMap.get(mi) ?? { total: 0, quantity: 0 };
      e.total += it.subtotal;
      e.quantity += it.quantity;
      catMap.set(mi, e);
    }
  }

  return {
    student: {
      id: student.id, studentCode: student.studentCode, name: student.name, email: student.email,
      department: student.department, course: student.course, year: student.year, phone: student.phone,
      status: student.user.isActive ? 'ACTIVE' : 'INACTIVE',
      lastLogin: student.user.lastLogin?.toISOString() ?? null,
    },
    spending: {
      today: today._sum?.totalAmount ?? 0,
      week: week._sum?.totalAmount ?? 0,
      month: month._sum?.totalAmount ?? 0,
      total: totalAgg._sum?.totalAmount ?? 0,
      totalOrders: totalAgg._count._all,
    },
    byCafe: [...cafeMap.values()].filter((c) => c.orders > 0).sort((a, b) => b.total - a.total),
    byCategory: [...catMap.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total),
    orders: orders.map(toOrderDto),
  };
}

// helper kept tiny — category lookup per menu item (orders list is capped at 100)
async function findCatName(menuItemId: string): Promise<string> {
  const it = await prisma.menuItem.findUnique({
    where: { id: menuItemId },
    select: { category: { select: { name: true } } },
  });
  return it?.category?.name ?? 'Other';
}

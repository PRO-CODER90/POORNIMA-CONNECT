import { prisma } from '@/cafe/lib/db';
import { dateKey, dayStart, validateDateKey } from '@/cafe/lib/dates';
import { reconcileCash } from '@/cafe/lib/revenue';
import type { AuthedAdmin } from '@/cafe/lib/rbac';
import { orderInclude, toOrderDto } from '../orders';

function monthAgoKey(monthsBack: number): string {
  const d = new Date(Date.now() - monthsBack * 30 * 86_400_000);
  return dateKey(d).slice(0, 7);
}

/** Revenue analytics across all dimensions (spec §40/§42/§43). */
export async function adminAnalytics(admin: AuthedAdmin, params?: { days?: number }) {
  const days = Math.min(90, Math.max(7, params?.days ?? 30));
  const from = new Date(dayStart().getTime() - (days - 1) * 86_400_000);
  const sixMonthsAgo = new Date(monthAgoKey(5) + '-01T00:00:00+05:30');

  const [byDay, byCafe, byItem, byCategoryRows, byMonth, total] = await Promise.all([
    prisma.order.findMany({ where: { createdAt: { gte: from }, orderStatus: { not: 'CANCELLED' } }, select: { totalAmount: true, createdAt: true } }),
    prisma.order.groupBy({
      by: ['cafeId'],
      where: { createdAt: { gte: from }, orderStatus: { not: 'CANCELLED' } },
      _sum: { totalAmount: true, itemCount: true },
      _count: { _all: true },
    }),
    prisma.orderItem.groupBy({
      by: ['itemName'],
      where: { order: { createdAt: { gte: from }, orderStatus: { not: 'CANCELLED' } } },
      _sum: { subtotal: true, quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 20,
    }),
    prisma.orderItem.findMany({
      where: { order: { createdAt: { gte: from }, orderStatus: { not: 'CANCELLED' } } },
      select: { subtotal: true, quantity: true, menuItem: { select: { category: { select: { name: true } }, cafe: { select: { name: true } } } } },
    }),
    prisma.order.findMany({ where: { createdAt: { gte: sixMonthsAgo }, orderStatus: { not: 'CANCELLED' } }, select: { totalAmount: true, createdAt: true } }),
    prisma.order.findMany({ where: { createdAt: { gte: from }, orderStatus: { not: 'CANCELLED' } }, select: { totalAmount: true, itemCount: true } }),
  ]);

  const dayMap = new Map<string, number>();
  for (const o of byDay) dayMap.set(dateKey(o.createdAt), (dayMap.get(dateKey(o.createdAt)) ?? 0) + o.totalAmount);

  const monthMap = new Map<string, number>();
  for (const o of byMonth) {
    const k = dateKey(o.createdAt).slice(0, 7);
    monthMap.set(k, (monthMap.get(k) ?? 0) + o.totalAmount);
  }

  const cafeRows = await prisma.cafe.findMany({ select: { id: true, name: true, code: true, coverEmoji: true } });
  const cafeById = new Map(cafeRows.map((c) => [c.id, c]));

  const catMap = new Map<string, { total: number; quantity: number }>();
  for (const r of byCategoryRows) {
    const name = r.menuItem.category?.name ?? 'Other';
    const e = catMap.get(name) ?? { total: 0, quantity: 0 };
    e.total += r.subtotal;
    e.quantity += r.quantity;
    catMap.set(name, e);
  }

  // weekly buckets (last 8 ISO-ish weeks by 7-day windows)
  const weekMap = new Map<number, number>();
  for (const o of byDay) {
    const d = new Date(o.createdAt);
    const week = Math.floor((Date.now() - d.getTime()) / (7 * 86_400_000));
    weekMap.set(week, (weekMap.get(week) ?? 0) + o.totalAmount);
  }
  const weekly: { label: string; value: number }[] = [];
  for (let w = 7; w >= 0; w--) {
    const start = new Date(Date.now() - (w + 1) * 7 * 86_400_000 + 1);
    weekly.push({ label: dateKey(start).slice(5), value: weekMap.get(w) ?? 0 });
  }

  return {
    range: { from: from.toISOString(), days },
    byDay: [...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => ({ date, value })),
    byWeek: weekly,
    byMonth: [...monthMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, value]) => ({ month, value })),
    byCafe: byCafe
      .map((r) => ({
        id: r.cafeId,
        code: cafeById.get(r.cafeId)?.code ?? '',
        name: cafeById.get(r.cafeId)?.name ?? 'Unknown',
        coverEmoji: cafeById.get(r.cafeId)?.coverEmoji ?? '☕',
        revenue: r._sum?.totalAmount ?? 0,
        orders: r._count._all,
        items: r._sum?.itemCount ?? 0,
      }))
      .sort((a, b) => b.revenue - a.revenue),
    byCategory: [...catMap.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total),
    byItem: byItem.map((r) => ({ name: r.itemName, quantity: r._sum?.quantity ?? 0, revenue: r._sum?.subtotal ?? 0 })),
    totals: {
      revenue: total.reduce((a, o) => a + o.totalAmount, 0),
      items: total.reduce((a, o) => a + o.itemCount, 0),
      orders: total.length,
    },
  };
}

// ─────────────────────────────── reports ───────────────────────────────

/** Daily report (spec §45): totals + transaction-level detail. */
export async function adminDailyReport(admin: AuthedAdmin, date: string) {
  const key = validateDateKey(date);
  if (!key) throw new (await import('@/cafe/lib/api')).ApiError(400, 'Date must be YYYY-MM-DD.');
  const from = dayStart(key);
  const to = new Date(from.getTime() + 86_399_999);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: from, lte: to } },
    include: orderInclude,
    orderBy: { createdAt: 'asc' },
  });

  const recon = reconcileCash(orders.map((o) => ({ totalAmount: o.totalAmount, orderStatus: o.orderStatus, paymentStatus: o.paymentStatus })));
  const studentsServed = new Set(orders.filter((o) => o.orderStatus !== 'CANCELLED').map((o) => o.studentId)).size;
  const itemsSold = orders.filter((o) => o.orderStatus !== 'CANCELLED').reduce((a, o) => a + o.itemCount, 0);

  return {
    date: key,
    summary: {
      totalOrders: orders.length,
      validOrders: recon.validOrders,
      revenue: recon.expectedCash,
      cashReceived: recon.collectedCash,
      pendingCash: recon.pendingCash,
      cancelledOrders: recon.cancelledOrders,
      studentsServed,
      itemsSold,
    },
    transactions: orders.map(toOrderDto),
  };
}

/** Monthly report per cafe + items (spec §48). */
export async function adminMonthlyReport(admin: AuthedAdmin, month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new (await import('@/cafe/lib/api')).ApiError(400, 'Month must be YYYY-MM.');
  const from = new Date(`${month}-01T00:00:00+05:30`);
  const to = new Date(from.getTime() + 40 * 86_400_000);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: from, lt: to } },
    select: { totalAmount: true, orderStatus: true, paymentStatus: true, cafeId: true, itemCount: true, createdAt: true },
  });
  const byCafe = new Map<string, { revenue: number; orders: number; cash: number; pending: number; items: number }>();
  for (const o of orders) {
    if (o.orderStatus === 'CANCELLED') continue;
    const e = byCafe.get(o.cafeId) ?? { revenue: 0, orders: 0, cash: 0, pending: 0, items: 0 };
    e.revenue += o.totalAmount;
    e.orders += 1;
    e.items += o.itemCount;
    if (o.paymentStatus === 'PAID') e.cash += o.totalAmount;
    else e.pending += o.totalAmount;
    byCafe.set(o.cafeId, e);
  }
  const cafes = await prisma.cafe.findMany({ select: { id: true, name: true, code: true, coverEmoji: true } });

  const recon = reconcileCash(orders);
  return {
    month,
    summary: { revenue: recon.expectedCash, cashReceived: recon.collectedCash, pendingCash: recon.pendingCash, validOrders: recon.validOrders, cancelled: recon.cancelledOrders },
    byCafe: cafes.map((c) => ({ ...c, ...(byCafe.get(c.id) ?? { revenue: 0, orders: 0, cash: 0, pending: 0, items: 0 }) })),
  };
}

/** CSV export (spec §48). */
export async function adminExport(admin: AuthedAdmin, type: string, params: URLSearchParams): Promise<{ filename: string; csv: string }> {
  const header = (rows: string[][]) => rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');

  if (type === 'daily') {
    const date = params.get('date') ?? dateKey();
    const report = await adminDailyReport(admin, date);
    const rows: string[][] = [
      ['Order ID', 'Date', 'Time', 'Cafe', 'Student ID', 'Student Name', 'Items', 'Amount (INR)', 'Order Status', 'Payment Status'],
      ...report.transactions.map((o) => [
        o.orderNumber,
        dateKey(new Date(o.createdAt)),
        new Date(o.createdAt).toTimeString().slice(0, 5),
        o.cafe.name,
        o.student?.studentCode ?? '',
        o.student?.name ?? '',
        o.items.map((i) => `${i.name} x${i.quantity}`).join('; '),
        String(o.totalAmount),
        o.orderStatus,
        o.paymentStatus,
      ]),
    ];
    return { filename: `daily-report-${report.date}.csv`, csv: header(rows) };
  }

  if (type === 'monthly') {
    const month = params.get('month') ?? dateKey().slice(0, 7);
    const report = await adminMonthlyReport(admin, month);
    const rows: string[][] = [
      ['Cafe', 'Orders', 'Revenue (INR)', 'Cash Received (INR)', 'Pending (INR)', 'Items Sold'],
      ...report.byCafe.map((c) => [c.name, String(c.orders), String(c.revenue), String(c.cash), String(c.pending), String(c.items)]),
    ];
    return { filename: `monthly-report-${month}.csv`, csv: header(rows) };
  }

  if (type === 'cafe') {
    const cafeId = params.get('cafe');
    const from = params.get('from');
    const to = params.get('to');
    const conds: Record<string, unknown> = {};
    if (cafeId) conds.cafeId = cafeId;
    const dateConds: Record<string, Date> = {};
    if (validateDateKey(from ?? '')) dateConds.gte = dayStart(validateDateKey(from!)!);
    if (validateDateKey(to ?? '')) dateConds.lte = new Date(dayStart(validateDateKey(to!)!).getTime() + 86_399_999);
    if (Object.keys(dateConds).length) conds.createdAt = dateConds;
    const orders = await prisma.order.findMany({ where: conds as never, include: orderInclude, orderBy: { createdAt: 'desc' }, take: 2000 });
    const rows: string[][] = [
      ['Order ID', 'Date', 'Time', 'Cafe', 'Student ID', 'Student Name', 'Items', 'Amount (INR)', 'Order Status', 'Payment Status', 'Paid At', 'Paid By Staff'],
      ...orders.map((o) => [
        o.orderNumber,
        dateKey(new Date(o.createdAt)),
        new Date(o.createdAt).toTimeString().slice(0, 5),
        o.cafe.name,
        o.student?.studentCode ?? '',
        o.student?.name ?? '',
        o.items.map((i) => `${i.itemName} x${i.quantity}`).join('; '),
        String(o.totalAmount),
        o.orderStatus,
        o.paymentStatus,
        o.paidAt ? new Date(o.paidAt).toISOString().replace('T', ' ').slice(0, 16) : '',
        o.paidByStaff?.name ?? '',
      ]),
    ];
    return { filename: `cafe-report-${cafeId ? 'cafe' : 'all'}-${Date.now()}.csv`, csv: header(rows) };
  }

  if (type === 'students') {
    const students = await prisma.student.findMany({
      include: { orders: { select: { totalAmount: true, orderStatus: true } } },
      orderBy: { studentCode: 'asc' },
    });
    const rows: string[][] = [
      ['Student ID', 'Name', 'Email', 'Department', 'Course', 'Year', 'Total Orders', 'Total Spending (INR)'],
      ...students.map((s) => {
        const valid = s.orders.filter((o) => o.orderStatus !== 'CANCELLED');
        return [s.studentCode, s.name, s.email, s.department, s.course, String(s.year), String(valid.length), String(valid.reduce((a, o) => a + o.totalAmount, 0))];
      }),
    ];
    return { filename: `student-report-${dateKey()}.csv`, csv: header(rows) };
  }

  if (type === 'sales') {
    const orders = await prisma.order.findMany({
      where: { orderStatus: { not: 'CANCELLED' } },
      select: { items: { select: { itemName: true, quantity: true, subtotal: true } } },
    });
    const map = new Map<string, { qty: number; revenue: number }>();
    for (const o of orders) for (const it of o.items) {
      const e = map.get(it.itemName) ?? { qty: 0, revenue: 0 };
      e.qty += it.quantity;
      e.revenue += it.subtotal;
      map.set(it.itemName, e);
    }
    const rows: string[][] = [
      ['Item', 'Quantity Sold', 'Revenue (INR)'],
      ...[...map.entries()].sort((a, b) => b[1].revenue - a[1].revenue).map(([name, v]) => [name, String(v.qty), String(v.revenue)]),
    ];
    return { filename: `sales-report-${dateKey()}.csv`, csv: header(rows) };
  }

  throw new (await import('@/cafe/lib/api')).ApiError(400, 'Unknown export type.');
}

import { prisma } from '@/cafe/lib/db';
import { dayEnd, dayStart } from '@/cafe/lib/dates';
import { reconcileCash } from '@/cafe/lib/revenue';
import type { AuthedAdmin } from '@/cafe/lib/rbac';

/** Payments list + per-cafe cash reconciliation (spec §46). */
export async function adminPayments(admin: AuthedAdmin, q: URLSearchParams) {
  const cafeId = q.get('cafe');
  const today = { gte: dayStart(), lte: dayEnd() };

  const [cafes, reconRows, payments] = await Promise.all([
    prisma.cafe.findMany({ select: { id: true, name: true, code: true, coverEmoji: true } }),
    prisma.order.findMany({
      where: { ...(cafeId ? { cafeId } : {}), createdAt: today, orderStatus: { not: 'CANCELLED' } },
      select: { totalAmount: true, orderStatus: true, paymentStatus: true, cafeId: true },
    }),
    prisma.payment.findMany({
      where: { order: { ...(cafeId ? { cafeId } : {}) } },
      include: { order: { include: { cafe: { select: { name: true, code: true } }, student: { select: { name: true, studentCode: true } } } } },
      orderBy: { receivedAt: 'desc' },
      take: 200,
    }),
  ]);

  const perCafe = cafes.map((c) => {
    const rows = reconRows.filter((r) => r.cafeId === c.id);
    return {
      id: c.id,
      name: c.name,
      code: c.code,
      coverEmoji: c.coverEmoji,
      recon: reconcileCash(rows),
      scope: 'today',
    };
  });

  return {
    perCafe,
    payments: payments
      .filter((p) => p.status === 'PAID' && p.receivedAt)
      .map((p) => ({
        id: p.id,
        orderNumber: p.order.orderNumber,
        cafe: p.order.cafe,
        student: p.order.student,
        amount: p.amount,
        method: p.method,
        receivedAt: p.receivedAt!.toISOString(),
        receivedByStaffId: p.receivedByStaffId,
      })),
  };
}

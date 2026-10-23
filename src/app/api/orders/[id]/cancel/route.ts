import { NextResponse } from 'next/server';
import { requireAdmin, requireStaff, requireStudent } from '@/cafe/lib/rbac';
import { handleApi, readBody } from '@/cafe/lib/api';
import { cancelOrder } from '@/cafe/server/orders';

export const POST = handleApi(async (req, ctx) => {
  const { id } = await ctx.params;
  const orderId = Array.isArray(id) ? id[0] : id;
  const body = (await readBody(req).catch(() => ({}))) as { reason?: string };
  const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 200) : undefined;

  const session = await import('@/cafe/lib/auth').then((m) => m.getSession());
  if (!session) throw new (await import('@/cafe/lib/api')).ApiError(401, 'Please log in.');

  if (session.role === 'STUDENT') {
    const student = await requireStudent();
    return NextResponse.json({ order: await cancelOrder(orderId, reason, { kind: 'student', ctx: student }) });
  }
  if (session.role === 'CAFE_STAFF') {
    const staff = await requireStaff();
    return NextResponse.json({ order: await cancelOrder(orderId, reason, { kind: 'staff', ctx: staff }) });
  }
  if (session.role === 'ADMIN') {
    const admin = await requireAdmin();
    return NextResponse.json({ order: await cancelOrder(orderId, reason, { kind: 'admin', ctx: admin }) });
  }
  throw new (await import('@/cafe/lib/api')).ApiError(403, 'Forbidden');
});

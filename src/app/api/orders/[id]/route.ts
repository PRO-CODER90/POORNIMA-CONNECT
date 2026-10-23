import { NextResponse } from 'next/server';
import { getSession } from '@/cafe/lib/auth';
import { prisma } from '@/cafe/lib/db';
import { forbidden, handleApi, notFound, type ApiContext } from '@/cafe/lib/api';
import { assertStaffCafe } from '@/cafe/lib/rbac';
import { getStudentOrder, orderInclude, toOrderDto } from '@/cafe/server/orders';

export const GET = handleApi(async (req, ctx) => {
  const { id } = await ctx.params;
  const orderId = Array.isArray(id) ? id[0] : id;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Please log in.' }, { status: 401 });

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: orderInclude });
  if (!order) throw notFound('Order not found.');

  if (session.role === 'STUDENT') {
    // Strict ownership: students only ever see their own orders (spec §65).
    if (order.studentId !== (await studentIdOf(session.id))) throw notFound('Order not found.');
    return NextResponse.json({ order: toOrderDto(order) });
  }
  if (session.role === 'CAFE_STAFF') {
    const staff = await prisma.cafeStaff.findUnique({ where: { userId: session.id } });
    if (!staff) throw forbidden();
    assertStaffCafe(staff, order.cafeId);
    return NextResponse.json({ order: toOrderDto(order) });
  }
  if (session.role === 'ADMIN') {
    return NextResponse.json({ order: toOrderDto(order) });
  }
  throw forbidden();
});

async function studentIdOf(userId: string) {
  const s = await prisma.student.findUnique({ where: { userId } });
  return s?.id ?? null;
}

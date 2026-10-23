import { NextResponse } from 'next/server';
import { getSession } from '@/cafe/lib/auth';
import { requireAdmin, requireStaff } from '@/cafe/lib/rbac';
import { forbidden, handleApi, readBody, unauthorized, type ApiContext } from '@/cafe/lib/api';
import { advanceOrder, cancelOrder } from '@/cafe/server/orders';
import { STAFF_ACTIONS } from '@/cafe/lib/orders';
import { badRequest } from '@/cafe/lib/api';

/**
 * Staff status transitions: { action: 'accept'|'preparing'|'ready'|'completed' }
 * Admin may also use { action: 'cancel', reason }.
 */
export const POST = handleApi(async (req, ctx) => {
  const { id } = await ctx.params;
  const orderId = Array.isArray(id) ? id[0] : id;
  const body = (await readBody(req)) as { action?: string; reason?: string };
  const action = body?.action;
  if (!action) throw badRequest('Action is required.');

  const session = await getSession();
  if (!session) throw unauthorized();

  if (action === 'cancel') {
    if (session.role === 'CAFE_STAFF') {
      const staff = await requireStaff();
      return NextResponse.json({ order: await cancelOrder(orderId, body.reason, { kind: 'staff', ctx: staff }) });
    }
    if (session.role === 'ADMIN') {
      const admin = await requireAdmin();
      return NextResponse.json({ order: await cancelOrder(orderId, body.reason, { kind: 'admin', ctx: admin }) });
    }
    throw forbidden('Students cannot use this endpoint. Use the cancel option on your order instead.');
  }

  if (!STAFF_ACTIONS[action]) throw badRequest('Unknown action.');
  if (session.role === 'CAFE_STAFF') {
    const staff = await requireStaff();
    return NextResponse.json({ order: await advanceOrder(staff, orderId, action) });
  }
  throw forbidden('Only cafe staff can update order status.');
});

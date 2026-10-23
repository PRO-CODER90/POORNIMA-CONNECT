import { NextResponse } from 'next/server';
import { getSession } from '@/cafe/lib/auth';
import { requireStaff } from '@/cafe/lib/rbac';
import { forbidden, handleApi, unauthorized, type ApiContext } from '@/cafe/lib/api';
import { markCashReceived } from '@/cafe/server/orders';

/**
 * Staff marks CASH RECEIVED for an order of their own cafe (spec §22).
 * Students and admins cannot mark payments.
 */
export const POST = handleApi(async (_req, ctx) => {
  const { id } = await ctx.params;
  const orderId = Array.isArray(id) ? id[0] : id;

  const session = await getSession();
  if (!session) throw unauthorized();
  if (session.role === 'STUDENT') throw forbidden('Only cafe staff can confirm cash payment.');
  if (session.role === 'ADMIN') throw forbidden('Only the assigned cafe staff can confirm cash payment.');

  const staff = await requireStaff();
  const order = await markCashReceived(staff, orderId);
  return NextResponse.json({ order });
});

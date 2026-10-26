import { NextResponse } from 'next/server';
import { guardPost } from '@/lib/api';
import { requireStudent } from '@/cafe/lib/rbac';
import { handleApi } from '@/cafe/lib/api';
import { startOnlinePayment } from '@/cafe/server/payments';

/** Details for Razorpay Checkout (opened in the student's browser) for one unpaid online order. */
export const POST = handleApi(async (req, ctx) => {
  const refused = guardPost(req, { json: false });
  if (refused) return refused;
  const auth = await requireStudent();
  const { id } = await ctx.params;
  return NextResponse.json(await startOnlinePayment(auth, Array.isArray(id) ? id[0] : id));
});

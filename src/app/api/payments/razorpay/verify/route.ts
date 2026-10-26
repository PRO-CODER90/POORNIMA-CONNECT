import { NextResponse } from 'next/server';
import { guardPost } from '@/lib/api';
import { prisma } from '@/cafe/lib/db';
import { requireStudent } from '@/cafe/lib/rbac';
import { ApiError, handleApi, notFound, readBody } from '@/cafe/lib/api';
import { razorpayConfig, verifyPaymentSignature } from '@/cafe/lib/razorpay';
import { confirmOnlinePayment } from '@/cafe/server/payments';

/** Checkout success callback. Trusted only after the HMAC signature checks out on the server. */
export const POST = handleApi(async (req) => {
  const refused = guardPost(req);
  if (refused) return refused;
  const auth = await requireStudent();
  const b = (await readBody(req)) as Record<string, unknown>;
  const orderId = String(b.razorpay_order_id ?? '');
  const paymentId = String(b.razorpay_payment_id ?? '');
  const signature = String(b.razorpay_signature ?? '');
  if (!verifyPaymentSignature(orderId, paymentId, signature, razorpayConfig().keySecret)) {
    throw new ApiError(400, 'Payment could not be verified. If money was taken, it will be confirmed automatically or refunded.');
  }
  // The payment must belong to one of this student's orders.
  const pay = await prisma.payment.findUnique({ where: { providerOrderId: orderId }, select: { order: { select: { studentId: true } } } });
  if (!pay || pay.order.studentId !== auth.student.id) throw notFound('Order not found.');
  return NextResponse.json(await confirmOnlinePayment(orderId, paymentId, 'checkout'));
});

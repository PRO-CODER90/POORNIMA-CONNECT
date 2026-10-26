// Online payments with Razorpay. The order (and its stock) is created first; the student then pays
// in Razorpay Checkout. A payment counts only after its signature is verified on the server
// (checkout callback or webhook, whichever arrives first; both are idempotent).
import { Prisma } from '@prisma/client';
import { prisma } from '@/cafe/lib/db';
import { badRequest, conflict, notFound } from '@/cafe/lib/api';
import { audit } from '@/cafe/lib/audit';
import { notify, notifyCafeStaff } from '@/cafe/lib/notify';
import { inr } from '@/cafe/lib/money';
import type { AuthedStudent } from '@/cafe/lib/rbac';
import { createRazorpayOrder, razorpayConfig, refundRazorpayPayment } from '@/cafe/lib/razorpay';
import { cancelAndRestock } from '@/cafe/lib/stockSql';
import { prismaQ } from './orders';

/** How long an online order may wait for payment before it is cancelled and its stock released. */
export const PAYMENT_WINDOW_MIN = 15;

/** Online orders still waiting for payment: hidden from the cafe counter. */
export const UNPAID_ONLINE = { paymentMethod: 'ONLINE', paymentStatus: 'PENDING' } satisfies Prisma.OrderWhereInput;

/** Cancels online orders not paid within the window, putting their stock back. Cheap; called often. */
export async function expireUnpaidOnlineOrders() {
  const stale = await prisma.order.findMany({
    where: { ...UNPAID_ONLINE, orderStatus: { not: 'CANCELLED' }, createdAt: { lt: new Date(Date.now() - PAYMENT_WINDOW_MIN * 60_000) } },
    select: { id: true },
    take: 50,
  });
  for (const o of stale) {
    await prisma.$transaction((tx) => cancelAndRestock(prismaQ(tx), o.id, 'Online payment not completed in time'));
  }
}

/** Opens (or re-opens) Razorpay Checkout for one of the student's unpaid online orders. */
export async function startOnlinePayment(student: AuthedStudent, orderId: string) {
  const cfg = razorpayConfig();
  if (!cfg.enabled) throw badRequest('Online payment is not available right now.');
  await expireUnpaidOnlineOrders();
  const order = await prisma.order.findFirst({ where: { id: orderId, studentId: student.student.id }, include: { payment: true } });
  if (!order) throw notFound('Order not found.');
  if (order.paymentMethod !== 'ONLINE') throw badRequest('This order is paid in cash at the counter.');
  if (order.orderStatus === 'CANCELLED') throw conflict('This order was cancelled because it was not paid in time. Please order again.');
  if (order.paymentStatus === 'PAID') throw conflict('This order is already paid.');

  let providerOrderId = order.payment?.providerOrderId ?? null;
  if (!providerOrderId) {
    const ro = await createRazorpayOrder(order.totalAmount * 100, order.orderNumber, { orderId: order.id, orderNumber: order.orderNumber });
    providerOrderId = ro.id;
    await prisma.payment.upsert({
      where: { orderId: order.id },
      create: { orderId: order.id, method: 'ONLINE', amount: order.totalAmount, status: 'PENDING', provider: 'RAZORPAY', providerOrderId },
      update: { method: 'ONLINE', provider: 'RAZORPAY', providerOrderId },
    });
  }
  return {
    keyId: cfg.keyId,
    razorpayOrderId: providerOrderId,
    amount: order.totalAmount * 100,
    currency: 'INR',
    orderNumber: order.orderNumber,
    prefill: { name: student.student.name, email: student.student.email },
    expiresAt: new Date(order.createdAt.getTime() + PAYMENT_WINDOW_MIN * 60_000).toISOString(),
  };
}

/**
 * Marks the order paid once a verified payment arrives. Idempotent: only the first call changes
 * anything. If the order had already expired, the money is refunded straight away.
 */
export async function confirmOnlinePayment(providerOrderId: string, providerPaymentId: string, source: 'checkout' | 'webhook') {
  const payment = await prisma.payment.findUnique({ where: { providerOrderId }, include: { order: true } });
  if (!payment) throw notFound('Payment not found.');
  const order = payment.order;

  const moved = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.updateMany({
      where: { id: payment.id, status: 'PENDING' },
      data: { status: 'PAID', providerPaymentId, receivedAt: new Date() },
    });
    if (p.count !== 1) return false;
    await tx.order.updateMany({ where: { id: order.id, paymentStatus: 'PENDING' }, data: { paymentStatus: 'PAID', paidAt: new Date() } });
    return true;
  });
  if (!moved) return { orderId: order.id, alreadyRecorded: true };

  await audit(null, 'ONLINE_PAYMENT_RECEIVED', 'Order', order.id, { amount: order.totalAmount, providerPaymentId, source });
  if (order.orderStatus === 'CANCELLED') {
    await refundIfPaidOnline(order.id); // paid after the window closed
    return { orderId: order.id, refunded: true };
  }
  await notifyCafeStaff(order.cafeId, '🔔 NEW ORDER (paid online)', `New order ${order.orderNumber}: ${order.itemCount} item(s), ${inr(order.totalAmount)} paid online.`);
  const student = await prisma.student.findUnique({ where: { id: order.studentId }, select: { userId: true } });
  if (student) await notify(student.userId, '🟢 Payment received', `We received ${inr(order.totalAmount)} for order ${order.orderNumber}. The cafe has your order.`, 'PAYMENT');
  return { orderId: order.id };
}

/** After a cancel: refund an online payment that was already captured. Failures are kept visible as REFUND_PENDING. */
export async function refundIfPaidOnline(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payment: true } });
  const pay = order?.payment;
  if (!order || order.paymentMethod !== 'ONLINE' || order.paymentStatus !== 'PAID' || !pay?.providerPaymentId) return;
  // Claim the refund first so two cancels can never refund twice.
  const claimed = await prisma.order.updateMany({ where: { id: orderId, paymentStatus: 'PAID' }, data: { paymentStatus: 'REFUND_PENDING' } });
  if (claimed.count !== 1) return;
  try {
    const r = await refundRazorpayPayment(pay.providerPaymentId, order.totalAmount * 100);
    await prisma.$transaction([
      prisma.order.update({ where: { id: orderId }, data: { paymentStatus: 'REFUNDED' } }),
      prisma.payment.update({ where: { id: pay.id }, data: { status: 'REFUNDED', refundId: r.id } }),
    ]);
    await audit(null, 'ONLINE_PAYMENT_REFUNDED', 'Order', orderId, { amount: order.totalAmount, refundId: r.id });
    const student = await prisma.student.findUnique({ where: { id: order.studentId }, select: { userId: true } });
    if (student) await notify(student.userId, 'Refund started', `${inr(order.totalAmount)} for order ${order.orderNumber} is being refunded to your original payment method (usually 5-7 working days).`, 'PAYMENT');
  } catch (e) {
    await prisma.payment.update({ where: { id: pay.id }, data: { status: 'REFUND_PENDING' } });
    await audit(null, 'ONLINE_REFUND_FAILED', 'Order', orderId, { error: e instanceof Error ? e.message : 'unknown' });
    console.error('[payments] refund failed; marked REFUND_PENDING', e instanceof Error ? e.message : e);
  }
}

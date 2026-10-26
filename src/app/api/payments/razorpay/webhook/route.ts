import { NextResponse } from 'next/server';
import { razorpayConfig, verifyWebhookSignature } from '@/cafe/lib/razorpay';
import { confirmOnlinePayment } from '@/cafe/server/payments';

/**
 * Razorpay → server notice that a payment was captured. Covers students who close the browser
 * before the checkout callback runs. Set this URL and RAZORPAY_WEBHOOK_SECRET in the Razorpay
 * dashboard (events: payment.captured, order.paid).
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 100_000) return NextResponse.json({ error: 'too large' }, { status: 413 });
  if (!verifyWebhookSignature(raw, req.headers.get('x-razorpay-signature') ?? '', razorpayConfig().webhookSecret)) {
    return NextResponse.json({ error: 'bad signature' }, { status: 400 });
  }
  let evt: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string; status?: string } } } };
  try {
    evt = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }
  const p = evt.payload?.payment?.entity;
  if ((evt.event === 'payment.captured' || evt.event === 'order.paid') && p?.id && p.order_id) {
    try {
      await confirmOnlinePayment(p.order_id, p.id, 'webhook');
    } catch (e) {
      // Unknown order (e.g. another app on the same account): acknowledge so Razorpay stops retrying.
      console.warn('[razorpay webhook] ignored', e instanceof Error ? e.message : e);
    }
  }
  return NextResponse.json({ ok: true });
}

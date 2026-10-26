// Razorpay (online payments). Keys come only from the server environment; the key id is public,
// the secrets never leave the server. Without keys the online option is simply not offered.
import { createHmac, timingSafeEqual } from 'node:crypto';

const API = 'https://api.razorpay.com/v1';

export function razorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || '';
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || '';
  return { keyId, keySecret, webhookSecret, enabled: !!(keyId && keySecret) };
}

export const onlinePaymentsEnabled = () => razorpayConfig().enabled;

function hmacHex(secret: string, data: string) {
  return createHmac('sha256', secret).update(data).digest('hex');
}

/** Constant-time compare of two hex signatures. */
function sameHex(a: string, b: string) {
  if (!/^[0-9a-f]+$/i.test(a) || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

/** Checkout success: signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string, secret: string) {
  return !!(orderId && paymentId && signature && secret) && sameHex(signature, hmacHex(secret, `${orderId}|${paymentId}`));
}

/** Webhooks: X-Razorpay-Signature = HMAC_SHA256(raw body, webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string, secret: string) {
  return !!(rawBody && signature && secret) && sameHex(signature, hmacHex(secret, rawBody));
}

type Fetch = typeof fetch;

async function call<T>(path: string, body: unknown, fetchImpl: Fetch = fetch): Promise<T> {
  const { keyId, keySecret } = razorpayConfig();
  const r = await fetchImpl(`${API}${path}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const d = (await r.json().catch(() => ({}))) as T & { error?: { description?: string } };
  if (!r.ok) throw new Error(`razorpay ${path} ${r.status}: ${d.error?.description ?? 'request failed'}`);
  return d;
}

/** Amounts are in paise. `receipt` is our order number (max 40 chars). */
export function createRazorpayOrder(amountPaise: number, receipt: string, notes: Record<string, string>, fetchImpl?: Fetch) {
  return call<{ id: string; amount: number; currency: string; status: string }>('/orders', { amount: amountPaise, currency: 'INR', receipt: receipt.slice(0, 40), notes }, fetchImpl);
}

export function refundRazorpayPayment(paymentId: string, amountPaise: number, fetchImpl?: Fetch) {
  return call<{ id: string; status: string }>(`/payments/${encodeURIComponent(paymentId)}/refund`, { amount: amountPaise, speed: 'normal' }, fetchImpl);
}

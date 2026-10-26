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

export class RazorpayError extends Error {
  status: number;
  detail: Record<string, unknown>;
  constructor(path: string, status: number, detail: Record<string, unknown>) {
    super(`razorpay ${path} ${status}: ${String(detail.description ?? 'request failed')}`);
    this.status = status;
    this.detail = detail;
  }
}

async function call<T>(path: string, body: unknown, fetchImpl: Fetch = fetch, method: 'GET' | 'POST' = 'POST'): Promise<T> {
  const { keyId, keySecret } = razorpayConfig();
  const r = await fetchImpl(`${API}${path}`, {
    method,
    headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`, ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  const d = (await r.json().catch(() => ({}))) as T & { error?: Record<string, unknown> };
  // Keep Razorpay's full error (code, field, reason, step) so failures can be diagnosed from the audit log.
  if (!r.ok) throw new RazorpayError(path, r.status, d.error ?? {});
  return d;
}

/** Amounts are in paise. `receipt` is our order number (max 40 chars). */
export function createRazorpayOrder(amountPaise: number, receipt: string, notes: Record<string, string>, fetchImpl?: Fetch) {
  return call<{ id: string; amount: number; currency: string; status: string }>('/orders', { amount: amountPaise, currency: 'INR', receipt: receipt.slice(0, 40), notes }, fetchImpl);
}

export interface RazorpayPayment {
  id: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  amount: number;
  amount_refunded: number;
}

export function fetchRazorpayPayment(paymentId: string, fetchImpl?: Fetch) {
  return call<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}`, undefined, fetchImpl, 'GET');
}

/**
 * Full refund. Checks the payment first: only a captured payment can be refunded; an authorized
 * but uncaptured one is released back to the payer by Razorpay automatically; one already
 * refunded needs nothing. The request body is empty (= refund the full captured amount).
 */
export async function refundRazorpayPayment(paymentId: string, fetchImpl?: Fetch): Promise<{ id: string | null; outcome: 'refunded' | 'already_refunded' | 'auto_released' }> {
  const p = await fetchRazorpayPayment(paymentId, fetchImpl);
  if (p.status === 'refunded' || (p.amount_refunded ?? 0) >= p.amount) return { id: null, outcome: 'already_refunded' };
  if (p.status === 'authorized' || p.status === 'failed' || p.status === 'created') return { id: null, outcome: 'auto_released' };
  const r = await call<{ id: string }>(`/payments/${encodeURIComponent(paymentId)}/refund`, {}, fetchImpl);
  return { id: r.id, outcome: 'refunded' };
}

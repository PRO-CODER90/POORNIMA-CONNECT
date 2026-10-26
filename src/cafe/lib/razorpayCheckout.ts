'use client';

// Opens Razorpay Checkout for one of the student's online orders and confirms the payment with
// our server. Resolves 'paid' or 'dismissed'; throws with a readable message on failure.

interface RzpResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
type RzpCtor = new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: { error?: { description?: string } }) => void) => void };

let loading: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if ((window as unknown as { Razorpay?: RzpCtor }).Razorpay) return Promise.resolve();
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error('Could not load the payment window. Check your connection and try again.'));
    };
    document.body.appendChild(s);
  });
  return loading;
}

async function json(r: Response) {
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? d.message ?? 'Payment failed. Please try again.');
  return d;
}

export async function payOnline(orderId: string): Promise<'paid' | 'dismissed'> {
  const [cfg] = await Promise.all([json(await fetch(`/api/orders/${orderId}/pay`, { method: 'POST' })), loadScript()]);
  const Razorpay = (window as unknown as { Razorpay: RzpCtor }).Razorpay;
  return new Promise((resolve, reject) => {
    const rzp = new Razorpay({
      key: cfg.keyId,
      order_id: cfg.razorpayOrderId,
      amount: cfg.amount,
      currency: cfg.currency,
      name: 'PU CafeConnect',
      description: `Order ${cfg.orderNumber}`,
      prefill: cfg.prefill,
      theme: { color: '#1f4fd1' },
      handler: async (resp: RzpResponse) => {
        try {
          await json(await fetch('/api/payments/razorpay/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(resp) }));
          resolve('paid');
        } catch (e) {
          reject(e);
        }
      },
      modal: { ondismiss: () => resolve('dismissed') },
    });
    rzp.on('payment.failed', (r) => reject(new Error(r.error?.description ?? 'Payment failed. No money was taken; please try again.')));
    rzp.open();
  });
}

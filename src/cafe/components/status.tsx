import { Badge } from './ui';

const ORDER_TONES: Record<string, 'blue' | 'indigo' | 'amber' | 'green' | 'gray' | 'red'> = {
  PLACED: 'blue',
  ACCEPTED: 'indigo',
  PREPARING: 'amber',
  READY: 'green',
  COMPLETED: 'gray',
  CANCELLED: 'red',
};

const ORDER_ICONS: Record<string, string> = {
  PLACED: '🕐',
  ACCEPTED: '📥',
  PREPARING: '👨‍🍳',
  READY: '🔔',
  COMPLETED: '✅',
  CANCELLED: '✖️',
};

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={ORDER_TONES[status] ?? 'gray'}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" aria-hidden />
      <span>{status}</span>
    </Badge>
  );
}

export function PaymentBadge({ status }: { status: string }) {
  if (status === 'PAID') {
    return (
      <Badge tone="green">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden />
        <span>CASH PAID</span>
      </Badge>
    );
  }
  return (
    <Badge tone="amber">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-600" aria-hidden />
      <span>CASH PENDING</span>
    </Badge>
  );
}

export function OpenBadge({ status }: { status: 'OPEN' | 'CLOSED' }) {
  if (status === 'OPEN') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50/95 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 shadow-sm backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
        OPEN
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-slate-100/95 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 shadow-sm backdrop-blur">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden />
      CLOSED
    </span>
  );
}

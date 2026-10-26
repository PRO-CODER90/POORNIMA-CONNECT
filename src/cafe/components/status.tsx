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

export function PaymentBadge({ status, method = 'CASH' }: { status: string; method?: string }) {
  const online = method === 'ONLINE';
  const [tone, dot, label] =
    status === 'PAID'
      ? (['green', 'bg-emerald-600', online ? 'PAID ONLINE' : 'CASH PAID'] as const)
      : status === 'REFUNDED'
        ? (['gray', 'bg-slate-500', 'REFUNDED'] as const)
        : status === 'REFUND_PENDING'
          ? (['red', 'bg-rose-600', 'REFUND PENDING'] as const)
          : online
            ? (['amber', 'bg-amber-600', 'AWAITING PAYMENT'] as const)
            : (['amber', 'bg-amber-600', 'CASH PENDING'] as const);
  return (
    <Badge tone={tone}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      <span>{label}</span>
    </Badge>
  );
}

export function OpenBadge({
  status,
  variant = 'default',
  reopensAt,
}: {
  status: 'OPEN' | 'CLOSED';
  /** `pill`: solid white pill used over student-panel cafe photos. */
  variant?: 'default' | 'pill';
  /** Shown as a tooltip and to screen readers when closed (pill variant). */
  reopensAt?: string;
}) {
  if (variant === 'pill') {
    const open = status === 'OPEN';
    const hint = !open && reopensAt ? `Closed · Reopens at ${reopensAt}` : undefined;
    return (
      <span
        title={hint}
        className={`inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-bold tracking-wide shadow-sm ${
          open ? 'text-open' : 'text-muted'
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${open ? 'bg-open' : 'bg-closed'}`} aria-hidden />
        {open ? 'OPEN' : 'CLOSED'}
        {hint ? <span className="sr-only">, reopens at {reopensAt}</span> : null}
      </span>
    );
  }
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

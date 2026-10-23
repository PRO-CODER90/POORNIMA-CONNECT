// All "business day" math uses the university timezone (Asia/Kolkata)
// explicitly, so results are correct regardless of server TZ.
export const TZ = 'Asia/Kolkata';

/** YYYY-MM-DD for a date in the university timezone. */
export function dateKey(d: Date = new Date()): string {
  return d.toLocaleDateString('en-CA', { timeZone: TZ });
}

/** Start of the local day (as an absolute instant). */
export function dayStart(date: string = dateKey()): Date {
  return new Date(`${date}T00:00:00+05:30`);
}

export function dayEnd(date: string = dateKey()): Date {
  return new Date(`${date}T23:59:59.999+05:30`);
}

/** Range for "today". */
export function todayRange(): { from: Date; to: Date } {
  return { from: dayStart(), to: dayEnd() };
}

/** Convert a {from,to} range into a Prisma DateTimeFilter. */
export function dateFilter(r: { from: Date; to: Date }): { gte: Date; lte: Date } {
  return { gte: r.from, lte: r.to };
}

/** Last N days including today. */
export function lastNDaysRange(n: number): { from: Date; to: Date } {
  const to = dayEnd();
  const from = new Date(dayStart().getTime() - (n - 1) * 86_400_000);
  return { from, to };
}

/** This calendar month so far. */
export function thisMonthRange(): { from: Date; to: Date } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.toLocaleDateString('en-CA', { timeZone: TZ, month: '2-digit' });
  const yy = now.toLocaleDateString('en-CA', { timeZone: TZ, year: 'numeric' });
  return { from: new Date(`${yy}-${m}-01T00:00:00+05:30`), to: dayEnd() };
}

export interface DayPoint {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "27 Sep"
  value: number;
}

export function dailySeries(rows: { date: string; value: number }[]): DayPoint[] {
  const map = new Map(rows.map((r) => [r.date, r.value]));
  const out: DayPoint[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(dayStart().getTime() - i * 86_400_000);
    const key = dateKey(d);
    out.push({
      date: key,
      label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: TZ }),
      value: map.get(key) ?? 0,
    });
  }
  return out;
}

export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: TZ,
  });
}

export function fmtTime(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: TZ,
  });
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: TZ,
  });
}

export function timeAgo(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  const s = Math.max(0, Math.floor((Date.now() - dt.getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** YYYY-MM-DD for an arbitrary date (helper for report date pickers). */
export function validateDateKey(s: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00+05:30`);
  if (Number.isNaN(d.getTime())) return null;
  return s;
}

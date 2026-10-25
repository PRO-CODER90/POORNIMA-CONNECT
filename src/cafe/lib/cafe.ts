import { TZ } from './dates';

export type CafeStatus = 'OPEN' | 'CLOSED';

export interface CafeLike {
  openingTime: string;
  closingTime: string;
  manualStatus: string | null;
  isActive: boolean;
}

/** Weekday and minutes since midnight in the university timezone, whatever the server TZ. */
export function campusClock(now: Date = new Date()): { sunday: boolean; mins: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return { sunday: get('weekday') === 'Sun', mins: Number(get('hour')) * 60 + Number(get('minute')) };
}

/**
 * Determine whether a cafe is open now.
 * - inactive cafe -> CLOSED
 * - manual override wins (admin or staff can force open/closed)
 * - Sundays -> CLOSED unless forced open
 * - otherwise compare "HH:MM" timings in IST (supports overnight ranges)
 */
export function cafeOpenState(cafe: CafeLike, now: Date = new Date()): CafeStatus {
  if (!cafe.isActive) return 'CLOSED';
  if (cafe.manualStatus === 'OPEN' || cafe.manualStatus === 'CLOSED') return cafe.manualStatus;
  const { sunday, mins } = campusClock(now);
  if (sunday) return 'CLOSED';
  const [oh, om] = cafe.openingTime.split(':').map(Number);
  const [ch, cm] = cafe.closingTime.split(':').map(Number);
  if ([oh, om, ch, cm].some((n) => Number.isNaN(n))) return 'CLOSED';
  const open = oh * 60 + (om || 0);
  const close = ch * 60 + (cm || 0);
  if (open <= close) return mins >= open && mins < close ? 'OPEN' : 'CLOSED';
  return mins >= open || mins < close ? 'OPEN' : 'CLOSED'; // overnight
}

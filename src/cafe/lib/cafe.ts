export type CafeStatus = 'OPEN' | 'CLOSED';

export interface CafeLike {
  openingTime: string;
  closingTime: string;
  manualStatus: string | null;
  isActive: boolean;
}

/**
 * Determine whether a cafe is open now.
 * - inactive cafe -> CLOSED
 * - manual override wins (admin can force open/closed)
 * - otherwise compare "HH:MM" timings (supports overnight ranges)
 */
export function cafeOpenState(cafe: CafeLike, now: Date = new Date()): CafeStatus {
  if (!cafe.isActive) return 'CLOSED';
  if (cafe.manualStatus === 'OPEN' || cafe.manualStatus === 'CLOSED') return cafe.manualStatus;
  const [oh, om] = cafe.openingTime.split(':').map(Number);
  const [ch, cm] = cafe.closingTime.split(':').map(Number);
  if ([oh, om, ch, cm].some((n) => Number.isNaN(n))) return 'CLOSED';
  const mins = now.getHours() * 60 + now.getMinutes();
  const open = oh * 60 + (om || 0);
  const close = ch * 60 + (cm || 0);
  if (open <= close) return mins >= open && mins < close ? 'OPEN' : 'CLOSED';
  return mins >= open || mins < close ? 'OPEN' : 'CLOSED'; // overnight
}

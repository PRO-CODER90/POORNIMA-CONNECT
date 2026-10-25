import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Clock, ArrowRight, UtensilsCrossed } from 'lucide-react';
import { fmtTime12 } from '@/cafe/utils/format';

export interface CafeCardData {
  id: string;
  code: string;
  name: string;
  description: string;
  location: string;
  coverEmoji: string;
  openingTime: string;
  closingTime: string;
  status: 'OPEN' | 'CLOSED';
  itemCount: number;
  /** Items that can be ordered right now (excludes hidden and sold-out). */
  availableCount?: number;
}

export const CAFE_IMAGES: Record<string, string> = {
  C1: '/images/cafes/c1.webp',
  C2: '/images/cafes/c2.webp',
  C3: '/images/cafes/c3.webp',
};

export function cafeImage(code: string) {
  return CAFE_IMAGES[code.toUpperCase()] ?? CAFE_IMAGES.C1;
}

export default function CafeCard({ cafe, showDescription = false }: { cafe: CafeCardData; showDescription?: boolean }) {
  const code = cafe.code.toUpperCase();
  const isOpen = cafe.status === 'OPEN';
  // "Cafe 1 · Chai Point" → "Chai Point"; the cafe number already shows in the code chip.
  const title = cafe.name.split('·').pop()!.trim();
  const opens = fmtTime12(cafe.openingTime);
  const count = cafe.availableCount ?? cafe.itemCount;

  return (
    <Link
      href={`/cafe/${cafe.code}`}
      className="surface group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-pu-500 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="relative h-48 w-full overflow-hidden bg-slate-100">
        <Image
          src={cafeImage(code)}
          alt=""
          fill
          sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw"
          className={`object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${
            isOpen ? '' : 'grayscale-[35%]'
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />

        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold tracking-wider text-pu-900 shadow-sm backdrop-blur">
            CAFE {code.replace(/^C/, "")}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide shadow-sm backdrop-blur ${
              isOpen ? 'bg-emerald-500/95 text-white' : 'bg-slate-900/70 text-white'
            }`}
          >
            <span className="relative flex h-1.5 w-1.5" aria-hidden>
              {isOpen ? <span className="absolute inset-0 animate-ping rounded-full bg-white/80 motion-reduce:hidden" /> : null}
              <span className={`relative h-1.5 w-1.5 rounded-full ${isOpen ? 'bg-white' : 'bg-rose-400'}`} />
            </span>
            {isOpen ? 'Open now' : 'Closed'}
          </span>
        </div>

        <div className="absolute inset-x-4 bottom-3.5 text-white">
          <h3 className="truncate text-xl font-bold leading-tight drop-shadow-sm" title={cafe.name}>
            {title}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-white/85">
            <MapPin size={13} className="shrink-0" aria-hidden />
            <span className="truncate">{cafe.location}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        {showDescription && cafe.description ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted">{cafe.description}</p>
        ) : null}

        <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-2 text-xs">
          <div className="flex items-center gap-2 rounded-xl bg-pu-50/70 px-3 py-2">
            <Clock size={15} className="shrink-0 text-pu-600" aria-hidden />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Hours</p>
              <p className="font-semibold leading-snug text-ink">
                {opens} – {fmtTime12(cafe.closingTime)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-pu-50/70 px-3 py-2">
            <UtensilsCrossed size={15} className="shrink-0 text-pu-600" aria-hidden />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Menu</p>
              <p className="truncate font-semibold text-ink">
                {count} item{count === 1 ? '' : 's'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3">
          <p className={`text-xs font-medium ${isOpen ? 'text-emerald-700' : 'text-muted'}`}>
            {isOpen ? 'Taking cash orders' : 'Not taking orders now'}
          </p>
          <span className={`${isOpen ? 'btn-solid-pu' : 'btn-outline-pu group-hover:bg-pu-50'} shrink-0`}>
            {isOpen ? 'Order now' : 'View menu'}
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}

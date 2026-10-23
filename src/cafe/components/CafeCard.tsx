import Link from 'next/link';
import { MapPin, Clock, ArrowRight } from 'lucide-react';
import { OpenBadge } from './status';
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
}

const CAFE_IMAGES: Record<string, string> = {
  C1: '/images/cafes/c1.jpg',
  C2: '/images/cafes/c2.jpg',
  C3: '/images/cafes/c3.jpg',
};

export default function CafeCard({ cafe }: { cafe: CafeCardData }) {
  const code = cafe.code.toUpperCase();
  const imageSrc = CAFE_IMAGES[code] ?? '/images/cafes/c1.jpg';
  const isOpen = cafe.status === 'OPEN';

  return (
    <Link
      href={`/cafe/${cafe.code}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] transition-all hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
    >
      {/* image container */}
      <div className="relative h-44 w-full overflow-hidden bg-slate-100">
        <img
          src={imageSrc}
          alt={cafe.name}
          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
            !isOpen ? 'grayscale-[25%] opacity-90' : ''
          }`}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/60 via-transparent to-black/20" />

        {/* top badges */}
        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          <span className="rounded-md border border-white/20 bg-navy/80 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-white backdrop-blur">
            CAFE {code}
          </span>
          <OpenBadge status={cafe.status} />
        </div>

        {/* bottom overlay info */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white">
          <span className="text-xs font-medium text-white/90 drop-shadow-sm">
            {cafe.itemCount} items available
          </span>
        </div>
      </div>

      {/* card body */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-navy transition-colors group-hover:text-amber">
            {cafe.name}
          </h3>
        </div>

        <div className="mt-2 space-y-1 text-xs text-slate-500">
          <div className="flex items-center gap-1.5 font-normal">
            <MapPin size={13} className="shrink-0 text-slate-400" aria-hidden />
            <span className="truncate">{cafe.location}</span>
          </div>
          <div className="flex items-center gap-1.5 font-normal">
            <Clock size={13} className="shrink-0 text-slate-400" aria-hidden />
            <span>
              {fmtTime12(cafe.openingTime)} – {fmtTime12(cafe.closingTime)}
            </span>
          </div>
        </div>

        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-500">
          {cafe.description}
        </p>

        {/* card footer */}
        <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100">
          <span className={`text-[11px] font-medium ${isOpen ? 'text-emerald-700' : 'text-slate-500'}`}>
            {isOpen ? 'Open for orders' : `Closed · Reopens at ${fmtTime12(cafe.openingTime)}`}
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white transition-colors group-hover:bg-amber">
            <span>View Menu</span>
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}

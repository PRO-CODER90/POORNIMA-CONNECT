import Link from 'next/link';
import Image from 'next/image';
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

  return (
    <Link
      href={`/cafe/${cafe.code}`}
      className="surface group flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-pu-500 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="relative h-36 w-full overflow-hidden bg-slate-100">
        <Image
          src={cafeImage(code)}
          alt={cafe.name}
          fill
          sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw"
          className={`object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${
            !isOpen ? 'grayscale-[25%]' : ''
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />

        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          <span className="rounded-lg bg-pu-900 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white">CAFE {code}</span>
          <OpenBadge status={cafe.status} variant="pill" reopensAt={fmtTime12(cafe.openingTime)} />
        </div>

        <span className="absolute bottom-2.5 left-3 text-xs font-medium text-white drop-shadow-sm">
          {cafe.itemCount} item{cafe.itemCount === 1 ? '' : 's'} available
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="truncate text-lg font-bold text-ink" title={cafe.name}>
          {cafe.name}
        </h3>

        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
          <MapPin size={14} className="shrink-0 text-pu-600" aria-hidden />
          <span className="truncate">{cafe.location}</span>
        </div>

        {showDescription && cafe.description ? (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">{cafe.description}</p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-2">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Clock size={14} className="shrink-0 text-pu-600" aria-hidden />
            <span className="whitespace-nowrap">
              {fmtTime12(cafe.openingTime)} – {fmtTime12(cafe.closingTime)}
            </span>
          </div>
          <span className="btn-outline-pu shrink-0 group-hover:bg-pu-50">
            View Menu
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}

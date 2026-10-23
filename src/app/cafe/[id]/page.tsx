import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { prisma } from '@/cafe/lib/db';
import { getSession } from '@/cafe/lib/auth';
import { cafeOpenState } from '@/cafe/lib/cafe';
import { fmtTime12 } from '@/cafe/utils/format';
import { OpenBadge } from '@/cafe/components/status';
import { CartProvider } from '@/cafe/components/cart/CartContext';
import MenuBrowser from '@/cafe/components/menu/MenuBrowser';
import CartFab from '@/cafe/components/cart/CartFab';
import CartDrawer from '@/cafe/components/cart/CartDrawer';
import RoleShell from '@/cafe/components/layout/RoleShell';

export const dynamic = 'force-dynamic';

const CAFE_IMAGES: Record<string, string> = {
  C1: '/images/cafes/c1.jpg',
  C2: '/images/cafes/c2.jpg',
  C3: '/images/cafes/c3.jpg',
};

export default async function CafePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect('/');
  if (session.role !== 'STUDENT') redirect('/dashboard?noaccess=1');

  const { id } = await params;

  const [student, cafe] = await Promise.all([
    prisma.student.findUnique({
      where: { userId: session.id },
      select: { name: true, studentCode: true },
    }),
    prisma.cafe.findFirst({
      where: { OR: [{ id }, { code: id.toUpperCase() }], isActive: true },
      include: {
        categories: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        menuItems: { where: { isActive: true } },
      },
    }),
  ]);

  if (!cafe) notFound();

  const code = cafe.code.toUpperCase();
  const imageSrc = CAFE_IMAGES[code] ?? '/images/cafes/c1.jpg';
  const openState = cafeOpenState(cafe);
  const isOpen = openState === 'OPEN';

  const browser = {
    id: cafe.id,
    code: cafe.code,
    name: cafe.name,
    description: cafe.description,
    location: cafe.location,
    coverEmoji: cafe.coverEmoji,
    openingTime: cafe.openingTime,
    closingTime: cafe.closingTime,
    status: openState,
    categories: cafe.categories.map((c) => ({ id: c.id, name: c.name, sortOrder: c.sortOrder })),
    items: cafe.menuItems.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      price: m.price,
      emoji: m.emoji,
      categoryId: m.categoryId,
      isAvailable: m.isAvailable,
    })),
  };

  return (
    <RoleShell
      role="student"
      roleLabel={cafe.name}
      subtitle={`Menu & Ordering · ${cafe.location}`}
      userName={student?.name ?? 'Student'}
      userMeta={student?.studentCode ?? 'PU2026'}
    >
      <CartProvider>
        <div className="space-y-6">
          {/* Back link */}
          <div>
            <Link
              href="/student/cafes"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy transition-colors"
            >
              <ArrowLeft size={14} aria-hidden />
              <span>Back to Campus Cafes</span>
            </Link>
          </div>

          {/* Cafe Header Card */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
            <div className="relative h-48 sm:h-60 w-full overflow-hidden bg-navy-950">
              <img
                src={imageSrc}
                alt={cafe.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/95 via-navy-950/50 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 text-white">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="rounded-md border border-white/20 bg-navy/80 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-white backdrop-blur">
                    CAFE {code}
                  </span>
                  <OpenBadge status={openState} />
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {cafe.name}
                </h1>

                <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-200">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={13} className="text-amber" aria-hidden />
                    <span>{cafe.location}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={13} className="text-amber" aria-hidden />
                    <span>
                      {fmtTime12(cafe.openingTime)} – {fmtTime12(cafe.closingTime)}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {cafe.description ? (
              <div className="border-t border-slate-100 bg-white px-5 py-3.5 sm:px-6 text-xs text-slate-600 leading-relaxed">
                {cafe.description}
              </div>
            ) : null}
          </div>

          {/* Closed banner */}
          {!isOpen && (
            <div
              className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-xs font-medium text-amber-900 shadow-sm"
              role="alert"
            >
              <AlertTriangle size={16} className="shrink-0 text-amber" aria-hidden />
              <span>
                <strong>Kitchen Currently Closed.</strong> You can browse all items and prices, but placing cash orders is disabled until {fmtTime12(cafe.openingTime)}.
              </span>
            </div>
          )}

          {/* Menu section */}
          <div>
            <div className="mb-4 flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div>
                <h2 className="text-lg font-bold text-navy">Cafe Menu</h2>
                <p className="text-xs text-slate-500">
                  {cafe.menuItems.length} items available · Pay cash at counter
                </p>
              </div>
            </div>

            <MenuBrowser cafe={browser} />
          </div>
        </div>

        <CartFab />
        <CartDrawer />
      </CartProvider>
    </RoleShell>
  );
}

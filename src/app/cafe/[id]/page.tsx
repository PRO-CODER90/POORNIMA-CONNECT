import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { prisma } from '@/cafe/lib/db';
import { getSession } from '@/cafe/lib/auth';
import { cafeOpenState, campusClock } from '@/cafe/lib/cafe';
import { fmtTime12 } from '@/cafe/utils/format';
import { OpenBadge } from '@/cafe/components/status';
import { CartProvider } from '@/cafe/components/cart/CartContext';
import MenuBrowser from '@/cafe/components/menu/MenuBrowser';
import CartFab from '@/cafe/components/cart/CartFab';
import CartDrawer from '@/cafe/components/cart/CartDrawer';
import RoleShell from '@/cafe/components/layout/RoleShell';
import { cafeImage } from '@/cafe/components/CafeCard';
import { getCafeWithMenu } from '@/cafe/server/student';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const cafe = await prisma.cafe.findFirst({ where: { OR: [{ id }, { code: id.toUpperCase() }], isActive: true }, select: { name: true } });
  return { title: cafe ? `${cafe.name} Menu` : 'Cafe Menu', robots: { index: false, follow: false } };
}

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
      select: { id: true, code: true, name: true, description: true, location: true, openingTime: true, closingTime: true, manualStatus: true, isActive: true },
    }),
  ]);

  if (!cafe) notFound();

  const code = cafe.code.toUpperCase();
  const imageSrc = cafeImage(code);
  const openState = cafeOpenState(cafe);
  const isOpen = openState === 'OPEN';
  const closedNote =
    cafe.manualStatus === 'CLOSED'
      ? 'until the cafe reopens'
      : campusClock().sunday
        ? 'today, as cafes are closed on Sundays'
        : `until ${fmtTime12(cafe.openingTime)}`;

  const menu = (await getCafeWithMenu(cafe.id))!;
  const browser = {
    id: menu.id,
    code: menu.code,
    name: menu.name,
    status: menu.status,
    categories: menu.categories,
    items: menu.items,
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
              className="inline-flex items-center gap-1.5 rounded text-sm font-semibold text-pu-600 transition-colors hover:text-pu-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pu-500"
            >
              <ArrowLeft size={15} aria-hidden />
              Back to Campus Cafes
            </Link>
          </div>

          {/* Cafe Header Card */}
          <div className="surface overflow-hidden">
            <div className="relative h-48 w-full overflow-hidden bg-pu-900 sm:h-60">
              <Image src={imageSrc} alt={cafe.name} fill preload sizes="(min-width:1152px) 1056px, 100vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 text-white">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="rounded-lg bg-pu-900 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white">CAFE {code}</span>
                  <OpenBadge status={openState} variant="pill" reopensAt={fmtTime12(cafe.openingTime)} />
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {cafe.name}
                </h1>

                <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-200">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={13} className="text-pu-200" aria-hidden />
                    <span>{cafe.location}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={13} className="text-pu-200" aria-hidden />
                    <span>
                      {fmtTime12(cafe.openingTime)} – {fmtTime12(cafe.closingTime)}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {cafe.description ? (
              <div className="border-t border-slate-100 px-5 py-3.5 text-sm leading-relaxed text-muted sm:px-6">
                {cafe.description}
              </div>
            ) : null}
          </div>

          {/* Closed banner */}
          {!isOpen && (
            <div
              className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-xs font-medium text-amber-900 shadow-sm"
              role="alert"
            >
              <AlertTriangle size={16} className="shrink-0 text-amber-600" aria-hidden />
              <span>
                <strong>Kitchen Currently Closed.</strong> You can browse all items and prices, but placing cash orders is disabled {closedNote}.
              </span>
            </div>
          )}

          {/* Menu section */}
          <div>
            <div className="mb-4">
              <div>
                <h2 className="text-xl font-bold text-ink">Cafe Menu</h2>
                <p className="text-sm text-muted">
                  {menu.availableCount} items available · Pay cash at counter
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

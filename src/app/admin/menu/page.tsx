import { requireAdminPage } from '@/cafe/lib/rbac';
import { prisma } from '@/cafe/lib/db';
import { badRequest } from '@/cafe/lib/api';
import MenuManager from '@/cafe/components/admin/MenuManager';

export const dynamic = 'force-dynamic';

export default async function AdminMenuPage({ searchParams }: { searchParams: Promise<{ cafe?: string }> }) {
  const admin = await requireAdminPage();
  const { cafe: cafeParam } = await searchParams;
  const cafes = await prisma.cafe.findMany({ orderBy: { code: 'asc' } });
  if (cafes.length === 0) throw badRequest('No cafes configured yet.');

  const target = cafes.find((c) => c.id === cafeParam || c.code === cafeParam) ?? cafes[0];
  const [items, categories] = await Promise.all([
    prisma.menuItem.findMany({ where: { cafeId: target.id }, orderBy: { createdAt: 'asc' }, include: { category: { select: { id: true, name: true } } } }),
    prisma.category.findMany({ where: { cafeId: target.id, isActive: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Menu Management</h1>
      <p className="mb-5 mt-1 text-sm text-slate-500">
        Add, edit, reprice and disable items per cafe. Price changes are audited and never affect past orders.
      </p>
      <MenuManager
        cafes={cafes.map((c) => ({ id: c.id, code: c.code, name: c.name }))}
        initialCafeId={target.id}
        initialItems={items}
        initialCategories={categories}
      />
    </div>
  );
}

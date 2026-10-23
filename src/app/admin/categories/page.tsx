import { requireAdminPage } from '@/cafe/lib/rbac';
import { prisma } from '@/cafe/lib/db';
import CategoryManager from '@/cafe/components/admin/CategoryManager';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage({ searchParams }: { searchParams: Promise<{ cafe?: string }> }) {
  const admin = await requireAdminPage();
  const { cafe: cafeParam } = await searchParams;
  const cafes = await prisma.cafe.findMany({ orderBy: { code: 'asc' } });
  const target = cafes.find((c) => c.id === cafeParam || c.code === cafeParam) ?? cafes[0];
  const categories = await prisma.category.findMany({
    where: { cafeId: target.id },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { items: { where: { isActive: true } } } } },
  });

  return (
    <div>
      <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Categories</h1>
      <p className="mb-5 mt-1 text-sm text-slate-500">
        Categories are cafe-specific. Deleting a category that still has items deactivates it instead, so order history stays intact.
      </p>
      <CategoryManager
        cafes={cafes.map((c) => ({ id: c.id, code: c.code, name: c.name }))}
        initialCafeId={target.id}
        initialCategories={categories}
      />
    </div>
  );
}

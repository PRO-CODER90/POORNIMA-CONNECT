import { requireAdminPage } from '@/cafe/lib/rbac';
import { prisma } from '@/cafe/lib/db';
import AdminOrdersTable from '@/cafe/components/admin/AdminOrdersTable';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  await requireAdminPage();
  const cafes = await prisma.cafe.findMany({ select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } });

  return (
    <div>
      <h1 className="text-xl font-black text-slate-900 sm:text-2xl">All Orders</h1>
      <p className="mb-5 mt-1 text-sm text-slate-500">Every order across all three cafes, with full filters.</p>
      <AdminOrdersTable cafes={cafes} />
    </div>
  );
}

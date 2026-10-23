import { requireAdminPage } from '@/cafe/lib/rbac';
import { adminStaffList } from '@/cafe/server/admin/staff';
import { prisma } from '@/cafe/lib/db';
import StaffManager from '@/cafe/components/admin/StaffManager';

export const dynamic = 'force-dynamic';

export default async function AdminStaffPage() {
  const admin = await requireAdminPage();
  const [staff, cafes] = await Promise.all([
    adminStaffList(admin),
    prisma.cafe.findMany({ select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } }),
  ]);

  return (
    <div>
      <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Cafe Staff</h1>
      <p className="mb-5 mt-1 text-sm text-slate-500">Manage staff accounts and their cafe assignments.</p>
      <StaffManager initial={staff} cafes={cafes} />
    </div>
  );
}

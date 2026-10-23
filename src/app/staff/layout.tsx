import { requireStaffPage } from '@/cafe/lib/rbac';
import RoleShell from '@/cafe/components/layout/RoleShell';

export const dynamic = 'force-dynamic';

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireStaffPage();
  const { staff, cafe } = auth;

  return (
    <RoleShell
      role="staff"
      roleLabel={`${cafe.name} — Staff Panel`}
      subtitle="Orders for your assigned cafe only"
      userName={staff.name}
      userMeta={staff.staffCode}
    >
      {children}
    </RoleShell>
  );
}

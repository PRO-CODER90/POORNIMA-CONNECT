import { requireStaffPage } from '@/cafe/lib/rbac';
import RoleShell from '@/cafe/components/layout/RoleShell';
import type { Metadata } from 'next';

// Signed-in area: never indexed (the X-Robots-Tag header in next.config.ts says the same).
export const metadata: Metadata = { robots: { index: false, follow: false } };

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

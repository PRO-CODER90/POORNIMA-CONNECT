import { requireAdminPage } from '@/cafe/lib/rbac';
import RoleShell from '@/cafe/components/layout/RoleShell';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAdminPage();
  const admin = auth.admin;

  return (
    <RoleShell
      role="admin"
      roleLabel="Admin Console"
      subtitle="University-wide cafe operations"
      userName={admin.name}
      userMeta="ADMIN"
    >
      {children}
    </RoleShell>
  );
}

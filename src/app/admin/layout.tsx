import { requireAdminPage } from '@/cafe/lib/rbac';
import RoleShell from '@/cafe/components/layout/RoleShell';
import type { Metadata } from 'next';

// Signed-in area: never indexed (the X-Robots-Tag header in next.config.ts says the same).
export const metadata: Metadata = { robots: { index: false, follow: false } };

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

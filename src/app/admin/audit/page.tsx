import { requireAdminPage } from '@/cafe/lib/rbac';
import { prisma } from '@/cafe/lib/db';
import { fmtDateTime } from '@/cafe/lib/dates';
import { Badge } from '@/cafe/components/ui';
import AuditFilter from '@/cafe/components/admin/AuditFilter';

export const dynamic = 'force-dynamic';

export default async function AdminAuditPage() {
  await requireAdminPage();
  const logs = await prisma.auditLog.findMany({
    include: { user: { select: { email: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });

  const rows = logs.map((l) => ({
    id: l.id,
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    metadata: l.metadata,
    userEmail: l.user?.email ?? 'system',
    userRole: l.user?.role ?? 'SYSTEM',
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <div>
      <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Audit Logs</h1>
      <p className="mb-5 mt-1 text-sm text-slate-500">
        {rows.length} recent events — logins, order lifecycle, cash receipts, menu price changes, staff and student account changes.
      </p>
      <AuditFilter initial={rows} />
    </div>
  );
}

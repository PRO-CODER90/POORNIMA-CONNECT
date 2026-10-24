import { requireAdminPage } from '@/cafe/lib/rbac';
import { prisma } from '@/cafe/lib/db';
import { fmtDateTime } from '@/cafe/lib/dates';
import { Badge } from '@/cafe/components/ui';
import AuditFilter from '@/cafe/components/admin/AuditFilter';

export const dynamic = 'force-dynamic';

const OUTCOME_TONE: Record<string, 'green' | 'amber' | 'red' | 'violet'> = {
  SUCCESS: 'green',
  BAD_CREDENTIALS: 'amber',
  LOCK_STARTED: 'red',
  LOCKED: 'red',
  GOOGLE_FAIL: 'violet',
};

export default async function AdminAuditPage() {
  await requireAdminPage();
  const logs = await prisma.auditLog.findMany({
    include: { user: { select: { email: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });

  // Password and Google sign-in outcomes (src/lib/loginGuard.ts). Never contains passwords.
  const logins = await prisma.$queryRaw<{ id: bigint; at: Date; login_id: string | null; ip: string | null; outcome: string }[]>`
    SELECT id, at, login_id, ip, outcome FROM login_events ORDER BY at DESC LIMIT 50`.catch(() => []);

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
      <h1 className="text-xl font-black text-ink sm:text-2xl">Audit Logs</h1>
      <p className="mb-5 mt-1 text-sm text-slate-500">
        {rows.length} recent events — logins, order lifecycle, cash receipts, menu price changes, staff and student account changes.
      </p>
      <AuditFilter initial={rows} />

      <h2 className="mb-3 mt-8 text-base font-bold text-ink">Sign-in attempts</h2>
      <p className="mb-3 text-sm text-slate-500">The last 50 password and Google sign-in outcomes, including lockouts.</p>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Outcome</th>
              <th className="px-4 py-3">Login ID / email</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {logins.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-500">No sign-in attempts recorded yet.</td>
              </tr>
            ) : (
              logins.map((l) => (
                <tr key={String(l.id)} className="border-b border-slate-50 hover:bg-pu-50/60">
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500">{fmtDateTime(l.at.toISOString())}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={OUTCOME_TONE[l.outcome] ?? 'gray'}>{l.outcome.replace('_', ' ')}</Badge>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{l.login_id ?? '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{l.ip ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

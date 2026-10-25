import { requireAdminPage } from '@/cafe/lib/rbac';
import ReportsPanel from '@/cafe/components/admin/ReportsPanel';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Admin · Reports' };

export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
  await requireAdminPage();
  return (
    <div>
      <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Reports & Export</h1>
      <p className="mb-5 mt-1 text-sm text-slate-500">
        Daily and monthly reports with cash reconciliation, plus one-click CSV exports for daily, monthly, cafe, student and sales reports.
      </p>
      <ReportsPanel />
    </div>
  );
}

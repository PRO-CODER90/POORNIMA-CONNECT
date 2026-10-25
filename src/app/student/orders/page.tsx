import { requireStudentPage } from '@/cafe/lib/rbac';
import OrdersList from '@/cafe/components/student/OrdersList';
import { PageHeader } from '@/cafe/components/ui';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'My Orders' };

export const dynamic = 'force-dynamic';

export default async function StudentOrdersPage() {
  await requireStudentPage();
  return (
    <div className="space-y-6">
      <PageHeader
        title="My Orders"
        sub="Track live kitchen progress, review order numbers, and verify cash payment status at the counter."
      />
      <OrdersList />
    </div>
  );
}

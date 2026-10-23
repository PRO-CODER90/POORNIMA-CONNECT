import { requireStudentPage } from '@/cafe/lib/rbac';
import OrdersList from '@/cafe/components/student/OrdersList';

export const dynamic = 'force-dynamic';

export default async function StudentOrdersPage() {
  await requireStudentPage();
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">My Orders</h1>
        <p className="mt-1 text-xs text-slate-500">
          Track live kitchen progress, review order numbers, and verify cash payment status at the counter.
        </p>
      </div>
      <OrdersList />
    </div>
  );
}

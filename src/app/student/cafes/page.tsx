import { requireStudentPage } from '@/cafe/lib/rbac';
import { listCafesForStudent } from '@/cafe/server/student';
import CafeCard from '@/cafe/components/CafeCard';
import { EmptyState } from '@/cafe/components/ui';
import { Coffee, Store } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function StudentCafesPage() {
  await requireStudentPage();
  const cafes = await listCafesForStudent();

  const openCount = cafes.filter((c) => c.status === 'OPEN').length;

  return (
    <div className="space-y-6">
      {/* Directory title header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
            Campus Dining Directory
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Browse campus cafes, check live kitchen operating hours, and place cash orders.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] sm:self-auto">
          <Store size={14} className="text-amber" aria-hidden />
          <span className="text-xs font-semibold text-navy">
            {openCount} of {cafes.length} Open Now
          </span>
        </div>
      </div>

      {cafes.length === 0 ? (
        <EmptyState
          icon={<Coffee size={24} />}
          title="No dining locations available"
          sub="Campus cafes are currently being configured by administration. Please check back soon."
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cafes.map((c) => (
            <CafeCard key={c.id} cafe={c} />
          ))}
        </div>
      )}
    </div>
  );
}

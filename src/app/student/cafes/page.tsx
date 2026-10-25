import { requireStudentPage } from '@/cafe/lib/rbac';
import { listCafesForStudent } from '@/cafe/server/student';
import CafeCard from '@/cafe/components/CafeCard';
import { EmptyState, PageHeader } from '@/cafe/components/ui';
import { Coffee } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Campus Cafes' };

export const dynamic = 'force-dynamic';

export default async function StudentCafesPage() {
  await requireStudentPage();
  const cafes = await listCafesForStudent();

  const openCount = cafes.filter((c) => c.status === 'OPEN').length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Campus Dining Directory"
        sub="Browse campus cafes, check live kitchen operating hours, and place cash orders."
        right={
          <span className="surface inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-ink">
            <span className={`h-2 w-2 rounded-full ${openCount > 0 ? 'bg-open' : 'bg-closed'}`} aria-hidden />
            {openCount} of {cafes.length} Open Now
          </span>
        }
      />

      {cafes.length === 0 ? (
        <EmptyState
          surface
          icon={<Coffee size={24} />}
          title="No dining locations available"
          sub="Campus cafes are currently being configured by administration. Please check back soon."
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {cafes.map((c) => (
            <CafeCard key={c.id} cafe={c} showDescription />
          ))}
        </div>
      )}
    </div>
  );
}

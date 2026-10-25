import { requireStaffPage } from '@/cafe/lib/rbac';
import StaffDashboard from '@/cafe/components/staff/StaffDashboard';
import CafeStatusSwitch from '@/cafe/components/staff/CafeStatusSwitch';
import { prisma } from '@/cafe/lib/db';
import { cafeOpenState } from '@/cafe/lib/cafe';
import { fmtTime12 } from '@/cafe/utils/format';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Counter' };

export const dynamic = 'force-dynamic';

export default async function StaffDashboardPage() {
  const { staff, cafe } = await requireStaffPage();
  const timing = await prisma.cafe.findUniqueOrThrow({ where: { id: cafe.id } });
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-black text-slate-900 sm:text-2xl">
            {cafe.coverEmoji ?? '☕'} {cafe.name} — Staff Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Welcome, <span className="font-bold text-slate-700">{staff.name}</span> · {staff.staffCode}
          </p>
        </div>
        <CafeStatusSwitch
          manualStatus={timing.manualStatus}
          status={cafeOpenState(timing)}
          hours={`${fmtTime12(timing.openingTime)} – ${fmtTime12(timing.closingTime)}`}
        />
      </div>
      <StaffDashboard />
    </div>
  );
}

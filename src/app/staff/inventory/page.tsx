import type { Metadata } from 'next';
import { requireStaffPage } from '@/cafe/lib/rbac';
import { listInventory } from '@/cafe/server/inventory';
import StaffInventory from '@/cafe/components/staff/StaffInventory';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Inventory', robots: { index: false, follow: false } };

export default async function StaffInventoryPage() {
  const { staff, cafe } = await requireStaffPage();
  const initial = await listInventory(staff.assignedCafeId);
  return <StaffInventory cafeName={cafe.name} initial={initial} />;
}

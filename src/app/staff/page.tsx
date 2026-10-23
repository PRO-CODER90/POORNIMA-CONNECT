import { redirect } from 'next/navigation';
import { requireStaffPage } from '@/cafe/lib/rbac';

export default async function StaffIndexPage() {
  await requireStaffPage();
  redirect('/staff/dashboard');
}

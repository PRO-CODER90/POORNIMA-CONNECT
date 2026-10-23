import { redirect } from 'next/navigation';
import { requireAdminPage } from '@/cafe/lib/rbac';

export default async function AdminIndexPage() {
  await requireAdminPage();
  redirect('/admin/dashboard');
}

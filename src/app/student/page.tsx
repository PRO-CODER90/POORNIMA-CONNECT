import { redirect } from 'next/navigation';
import { requireStudentPage } from '@/cafe/lib/rbac';

export default async function StudentIndexPage() {
  await requireStudentPage();
  redirect('/student/dashboard');
}

import Link from 'next/link';
import { requireAdminPage } from '@/cafe/lib/rbac';
import { adminStudents } from '@/cafe/server/admin/students';
import { inr } from '@/cafe/lib/money';
import { fmtDateTime } from '@/cafe/lib/dates';
import { Badge } from '@/cafe/components/ui';
import StudentSearch from '@/cafe/components/admin/StudentSearch';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Admin · Students' };

export const dynamic = 'force-dynamic';

export default async function AdminStudentsPage() {
  const admin = await requireAdminPage();
  const students = await adminStudents(admin, null);

  return (
    <div>
      <h1 className="text-xl font-black text-slate-900 sm:text-2xl">Students</h1>
      <p className="mb-5 mt-1 text-sm text-slate-500">
        {students.length} registered students · search by Student ID, name or email
      </p>
      <StudentSearch initial={students} />
    </div>
  );
}

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/cafe/lib/rbac';
import { handleApi } from '@/cafe/lib/api';
import { adminStudents } from '@/cafe/server/admin/students';

export const GET = handleApi(async (req) => {
  const admin = await requireAdmin();
  const q = new URL(req.url).searchParams;
  return NextResponse.json({ students: await adminStudents(admin, q.get('q')) });
});

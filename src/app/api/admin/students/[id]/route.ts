import { NextResponse } from 'next/server';
import { requireAdmin } from '@/cafe/lib/rbac';
import { handleApi, notFound, type ApiContext } from '@/cafe/lib/api';
import { adminStudentDetail } from '@/cafe/server/admin/students';

export const GET = handleApi(async (_req, ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const detail = await adminStudentDetail(admin, Array.isArray(id) ? id[0] : id);
  if (!detail) throw notFound('Student not found.');
  return NextResponse.json(detail);
});

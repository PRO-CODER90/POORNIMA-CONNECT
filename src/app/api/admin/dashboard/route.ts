import { NextResponse } from 'next/server';
import { requireAdmin } from '@/cafe/lib/rbac';
import { handleApi } from '@/cafe/lib/api';
import { adminDashboard } from '@/cafe/server/admin/dashboard';

export const GET = handleApi(async () => {
  const admin = await requireAdmin();
  return NextResponse.json(await adminDashboard(admin));
});

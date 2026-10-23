import { NextResponse } from 'next/server';
import { requireAdmin } from '@/cafe/lib/rbac';
import { handleApi } from '@/cafe/lib/api';
import { adminCafes } from '@/cafe/server/admin/dashboard';

export const GET = handleApi(async () => {
  const admin = await requireAdmin();
  return NextResponse.json({ cafes: await adminCafes(admin) });
});

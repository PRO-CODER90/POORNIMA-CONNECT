import { NextResponse } from 'next/server';
import { requireAdmin } from '@/cafe/lib/rbac';
import { handleApi } from '@/cafe/lib/api';
import { adminPayments } from '@/cafe/server/admin/payments';

export const GET = handleApi(async (req) => {
  const admin = await requireAdmin();
  return NextResponse.json(await adminPayments(admin, new URL(req.url).searchParams));
});

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/cafe/lib/rbac';
import { handleApi } from '@/cafe/lib/api';
import { adminOrders } from '@/cafe/server/admin/orders';

export const GET = handleApi(async (req) => {
  const admin = await requireAdmin();
  return NextResponse.json(await adminOrders(admin, new URL(req.url).searchParams));
});

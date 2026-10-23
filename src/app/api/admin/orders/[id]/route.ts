import { NextResponse } from 'next/server';
import { requireAdmin } from '@/cafe/lib/rbac';
import { handleApi, notFound, type ApiContext } from '@/cafe/lib/api';
import { adminOrderDetail } from '@/cafe/server/admin/orders';

export const GET = handleApi(async (_req, ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const detail = await adminOrderDetail(admin, Array.isArray(id) ? id[0] : id);
  if (!detail) throw notFound('Order not found.');
  return NextResponse.json({ order: detail });
});

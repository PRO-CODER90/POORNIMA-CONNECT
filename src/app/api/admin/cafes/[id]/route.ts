import { NextResponse } from 'next/server';
import { requireAdmin } from '@/cafe/lib/rbac';
import { handleApi, readBody, notFound, type ApiContext } from '@/cafe/lib/api';
import { adminCafeDetail } from '@/cafe/server/admin/dashboard';
import { adminUpdateCafe } from '@/cafe/server/admin/menu';

export const GET = handleApi(async (_req, ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const detail = await adminCafeDetail(admin, Array.isArray(id) ? id[0] : id);
  if (!detail) throw notFound('Cafe not found.');
  return NextResponse.json(detail);
});

export const PATCH = handleApi(async (req, ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const body = (await readBody(req)) as Record<string, unknown>;
  const cafe = await adminUpdateCafe(admin, Array.isArray(id) ? id[0] : id, body);
  return NextResponse.json({ cafe });
});

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/cafe/lib/rbac';
import { handleApi, readBody, type ApiContext } from '@/cafe/lib/api';
import { adminUpdateCategory, adminDeleteCategory } from '@/cafe/server/admin/menu';

export const PATCH = handleApi(async (req, ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const body = (await readBody(req)) as Record<string, unknown>;
  const category = await adminUpdateCategory(admin, Array.isArray(id) ? id[0] : id, body as never);
  return NextResponse.json({ category });
});

export const DELETE = handleApi(async (_req, ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  return NextResponse.json(await adminDeleteCategory(admin, Array.isArray(id) ? id[0] : id));
});

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/cafe/lib/rbac';
import { handleApi, readBody, type ApiContext } from '@/cafe/lib/api';
import { adminListCategories, adminCreateCategory } from '@/cafe/server/admin/menu';

export const GET = handleApi(async (_req, ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  return NextResponse.json({ categories: await adminListCategories(admin, Array.isArray(id) ? id[0] : id) });
});

export const POST = handleApi(async (req, ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const body = (await readBody(req)) as { name: string; description?: string; sortOrder?: number };
  const category = await adminCreateCategory(admin, Array.isArray(id) ? id[0] : id, body);
  return NextResponse.json({ category }, { status: 201 });
});

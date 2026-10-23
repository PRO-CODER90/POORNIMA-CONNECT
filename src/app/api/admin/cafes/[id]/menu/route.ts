import { NextResponse } from 'next/server';
import { requireAdmin } from '@/cafe/lib/rbac';
import { handleApi, readBody, type ApiContext } from '@/cafe/lib/api';
import { adminListMenu, adminCreateItem } from '@/cafe/server/admin/menu';

export const GET = handleApi(async (_req, ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  return NextResponse.json(await adminListMenu(admin, Array.isArray(id) ? id[0] : id));
});

export const POST = handleApi(async (req, ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const body = (await readBody(req)) as Record<string, unknown>;
  const item = await adminCreateItem(admin, Array.isArray(id) ? id[0] : id, body as never);
  return NextResponse.json({ item }, { status: 201 });
});

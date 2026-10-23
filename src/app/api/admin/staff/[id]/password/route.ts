import { NextResponse } from 'next/server';
import { requireAdmin } from '@/cafe/lib/rbac';
import { handleApi, readBody, badRequest, type ApiContext } from '@/cafe/lib/api';
import { adminResetStaffPassword } from '@/cafe/server/admin/staff';

export const POST = handleApi(async (req, ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const body = (await readBody(req)) as { password?: string };
  if (!body?.password || typeof body.password !== 'string') throw badRequest('New password is required.');
  await adminResetStaffPassword(admin, Array.isArray(id) ? id[0] : id, body.password);
  return NextResponse.json({ ok: true });
});

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/cafe/lib/rbac';
import { handleApi, readBody, type ApiContext } from '@/cafe/lib/api';
import { adminUpdateStaff, adminSetStaffActive, adminResetStaffPassword } from '@/cafe/server/admin/staff';

export const PATCH = handleApi(async (req, ctx) => {
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  const staffId = Array.isArray(id) ? id[0] : id;
  const body = (await readBody(req)) as { name?: string; cafeId?: string; isActive?: boolean };
  if (body.isActive !== undefined) {
    await adminSetStaffActive(admin, staffId, !!body.isActive);
    return NextResponse.json({ ok: true, isActive: body.isActive });
  }
  const staff = await adminUpdateStaff(admin, staffId, { name: body.name, cafeId: body.cafeId });
  return NextResponse.json({ staff: { id: staff.id, name: staff.name, staffCode: staff.staffCode, assignedCafeId: staff.assignedCafeId } });
});

export const DELETE = handleApi(async (_req, ctx) => {
  // Deactivation (keeps history intact) — hard delete is not offered in the UI.
  const admin = await requireAdmin();
  const { id } = await ctx.params;
  await adminSetStaffActive(admin, Array.isArray(id) ? id[0] : id, false);
  return NextResponse.json({ ok: true, deactivated: true });
});

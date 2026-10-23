import { NextResponse } from 'next/server';
import { requireAdmin } from '@/cafe/lib/rbac';
import { handleApi, readBody } from '@/cafe/lib/api';
import { adminStaffList, adminAddStaff } from '@/cafe/server/admin/staff';

export const GET = handleApi(async () => {
  const admin = await requireAdmin();
  return NextResponse.json({ staff: await adminStaffList(admin) });
});

export const POST = handleApi(async (req) => {
  const admin = await requireAdmin();
  const body = (await readBody(req)) as { name: string; email: string; password: string; cafeId: string };
  const staff = await adminAddStaff(admin, body);
  return NextResponse.json({ staff }, { status: 201 });
});

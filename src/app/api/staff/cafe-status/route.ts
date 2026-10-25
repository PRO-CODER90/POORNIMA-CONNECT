import { NextResponse } from 'next/server';
import { requireStaff } from '@/cafe/lib/rbac';
import { handleApi, readBody } from '@/cafe/lib/api';
import { staffSetCafeStatus } from '@/cafe/server/staff';

export const PATCH = handleApi(async (req) => {
  const staff = await requireStaff();
  const body = (await readBody(req)) as { manualStatus?: unknown };
  return NextResponse.json(await staffSetCafeStatus(staff, body?.manualStatus));
});

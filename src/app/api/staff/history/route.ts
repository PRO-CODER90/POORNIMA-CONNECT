import { NextResponse } from 'next/server';
import { requireStaff } from '@/cafe/lib/rbac';
import { handleApi } from '@/cafe/lib/api';
import { staffHistory } from '@/cafe/server/staff';

export const GET = handleApi(async () => {
  const staff = await requireStaff();
  return NextResponse.json(await staffHistory(staff, 7));
});

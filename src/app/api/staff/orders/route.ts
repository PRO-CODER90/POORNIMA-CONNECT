import { NextResponse } from 'next/server';
import { requireStaff } from '@/cafe/lib/rbac';
import { handleApi } from '@/cafe/lib/api';
import { staffOrders } from '@/cafe/server/staff';

export const GET = handleApi(async (req) => {
  const staff = await requireStaff();
  const q = new URL(req.url).searchParams;
  // NOTE: the cafe is taken from the staff session — a ?cafe=C2 parameter is ignored by design (spec §36).
  return NextResponse.json(await staffOrders(staff, q.get('filter') ?? 'all', q.get('q')));
});

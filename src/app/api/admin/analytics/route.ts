import { NextResponse } from 'next/server';
import { requireAdmin } from '@/cafe/lib/rbac';
import { handleApi } from '@/cafe/lib/api';
import { adminAnalytics } from '@/cafe/server/admin/analytics';

export const GET = handleApi(async (req) => {
  const admin = await requireAdmin();
  const q = new URL(req.url).searchParams;
  const days = q.get('days') ? Number(q.get('days')) : 30;
  return NextResponse.json(await adminAnalytics(admin, { days }));
});

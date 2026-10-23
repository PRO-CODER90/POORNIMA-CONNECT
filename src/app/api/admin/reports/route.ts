import { NextResponse } from 'next/server';
import { requireAdmin } from '@/cafe/lib/rbac';
import { handleApi } from '@/cafe/lib/api';
import { adminDailyReport, adminMonthlyReport } from '@/cafe/server/admin/analytics';

export const GET = handleApi(async (req) => {
  const admin = await requireAdmin();
  const q = new URL(req.url).searchParams;
  const type = q.get('type') ?? 'daily';
  if (type === 'daily') {
    const date = q.get('date') ?? '';
    return NextResponse.json(await adminDailyReport(admin, date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })));
  }
  if (type === 'monthly') {
    const month = q.get('month') ?? '';
    return NextResponse.json(await adminMonthlyReport(admin, month || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7)));
  }
  return NextResponse.json({ error: 'Unknown report type' }, { status: 400 });
});

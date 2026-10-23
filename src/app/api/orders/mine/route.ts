import { NextResponse } from 'next/server';
import { requireStudent } from '@/cafe/lib/rbac';
import { handleApi } from '@/cafe/lib/api';
import { listStudentOrders } from '@/cafe/server/orders';

export const GET = handleApi(async (req) => {
  const auth = await requireStudent();
  const orders = await listStudentOrders(auth, new URL(req.url).searchParams);
  return NextResponse.json({ orders });
});

import { NextResponse } from 'next/server';
import { requireStudent } from '@/cafe/lib/rbac';
import { handleApi, readBody } from '@/cafe/lib/api';
import { createOrder } from '@/cafe/server/orders';

export const POST = handleApi(async (req) => {
  const auth = await requireStudent();
  const body = (await readBody(req)) as { items?: unknown };
  const order = await createOrder(auth, body?.items);
  return NextResponse.json({ order }, { status: 201 });
});

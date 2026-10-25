import { NextResponse } from 'next/server';
import { handleApi } from '@/cafe/lib/api';
import { listMovements } from '@/cafe/server/inventory';
import { adminItemScope, param } from '@/cafe/server/inventoryScope';

export const GET = handleApi(async (req, ctx) => {
  const id = await param(ctx);
  const { scope } = await adminItemScope(id);
  const limit = Number(new URL(req.url).searchParams.get('limit') ?? 50) || 50;
  return NextResponse.json({ movements: await listMovements(scope, id, limit) });
});

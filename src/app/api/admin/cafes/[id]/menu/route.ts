import { NextResponse } from 'next/server';
import { guardPost } from '@/lib/api';
import { handleApi, readBody } from '@/cafe/lib/api';
import { createItem, listInventory } from '@/cafe/server/inventory';
import { adminCafeScope, param } from '@/cafe/server/inventoryScope';

export const GET = handleApi(async (_req, ctx) => {
  const { scope } = await adminCafeScope(await param(ctx));
  return NextResponse.json(await listInventory(scope.cafeId));
});

export const POST = handleApi(async (req, ctx) => {
  const refused = guardPost(req);
  if (refused) return refused;
  const { scope } = await adminCafeScope(await param(ctx));
  return NextResponse.json({ item: await createItem(scope, await readBody(req)) }, { status: 201 });
});

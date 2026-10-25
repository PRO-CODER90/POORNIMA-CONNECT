import { NextResponse } from 'next/server';
import { guardPost } from '@/lib/api';
import { handleApi, readBody } from '@/cafe/lib/api';
import { createItem, listInventory } from '@/cafe/server/inventory';
import { staffScope } from '@/cafe/server/inventoryScope';

export const GET = handleApi(async () => {
  const { scope } = await staffScope();
  return NextResponse.json(await listInventory(scope.cafeId));
});

export const POST = handleApi(async (req) => {
  const refused = guardPost(req);
  if (refused) return refused;
  const { scope } = await staffScope();
  return NextResponse.json({ item: await createItem(scope, await readBody(req)) }, { status: 201 });
});

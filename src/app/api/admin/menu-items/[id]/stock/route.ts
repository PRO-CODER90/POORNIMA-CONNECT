import { NextResponse } from 'next/server';
import { guardPost } from '@/lib/api';
import { handleApi, readBody } from '@/cafe/lib/api';
import { adjustItemStock } from '@/cafe/server/inventory';
import { adminItemScope, param } from '@/cafe/server/inventoryScope';

export const POST = handleApi(async (req, ctx) => {
  const refused = guardPost(req);
  if (refused) return refused;
  const id = await param(ctx);
  const { scope } = await adminItemScope(id);
  return NextResponse.json({ item: await adjustItemStock(scope, id, await readBody(req)) });
});

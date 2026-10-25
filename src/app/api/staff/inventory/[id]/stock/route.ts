import { NextResponse } from 'next/server';
import { guardPost } from '@/lib/api';
import { handleApi, readBody } from '@/cafe/lib/api';
import { adjustItemStock } from '@/cafe/server/inventory';
import { param, staffScope } from '@/cafe/server/inventoryScope';

export const POST = handleApi(async (req, ctx) => {
  const refused = guardPost(req);
  if (refused) return refused;
  const { scope } = await staffScope();
  return NextResponse.json({ item: await adjustItemStock(scope, await param(ctx), await readBody(req)) });
});

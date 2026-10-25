import { NextResponse } from 'next/server';
import { guardPost } from '@/lib/api';
import { handleApi } from '@/cafe/lib/api';
import { restoreItem } from '@/cafe/server/inventory';
import { param, staffScope } from '@/cafe/server/inventoryScope';

export const POST = handleApi(async (req, ctx) => {
  const refused = guardPost(req, { json: false });
  if (refused) return refused;
  const { scope } = await staffScope();
  return NextResponse.json({ item: await restoreItem(scope, await param(ctx)) });
});

import { NextResponse } from 'next/server';
import { guardPost } from '@/lib/api';
import { handleApi, readBody } from '@/cafe/lib/api';
import { archiveItem, updateItem } from '@/cafe/server/inventory';
import { param, staffScope } from '@/cafe/server/inventoryScope';

export const PATCH = handleApi(async (req, ctx) => {
  const refused = guardPost(req);
  if (refused) return refused;
  const { scope } = await staffScope();
  return NextResponse.json({ item: await updateItem(scope, await param(ctx), await readBody(req)) });
});

export const DELETE = handleApi(async (req, ctx) => {
  const refused = guardPost(req, { json: false });
  if (refused) return refused;
  const { scope } = await staffScope();
  return NextResponse.json({ item: await archiveItem(scope, await param(ctx)) });
});

import { NextResponse } from 'next/server';
import { guardPost } from '@/lib/api';
import { handleApi, readBody } from '@/cafe/lib/api';
import { archiveItem, updateItem } from '@/cafe/server/inventory';
import { adminItemScope, param } from '@/cafe/server/inventoryScope';

export const PATCH = handleApi(async (req, ctx) => {
  const refused = guardPost(req);
  if (refused) return refused;
  const id = await param(ctx);
  const { scope } = await adminItemScope(id);
  return NextResponse.json({ item: await updateItem(scope, id, await readBody(req)) });
});

export const DELETE = handleApi(async (req, ctx) => {
  const refused = guardPost(req, { json: false });
  if (refused) return refused;
  const id = await param(ctx);
  const { scope } = await adminItemScope(id);
  return NextResponse.json({ item: await archiveItem(scope, id) });
});

import { NextResponse } from 'next/server';
import { guardPost } from '@/lib/api';
import { handleApi, readBody } from '@/cafe/lib/api';
import { createCategory } from '@/cafe/server/inventory';
import { staffScope } from '@/cafe/server/inventoryScope';

export const POST = handleApi(async (req) => {
  const refused = guardPost(req);
  if (refused) return refused;
  const { scope } = await staffScope();
  return NextResponse.json({ category: await createCategory(scope, await readBody(req)) }, { status: 201 });
});

import { NextResponse } from 'next/server';
import { requireStudent } from '@/cafe/lib/rbac';
import { handleApi, notFound } from '@/cafe/lib/api';
import { cafeStock } from '@/cafe/server/student';

/** Polled by the menu every few seconds: packet quantities and availability for one cafe. */
export const GET = handleApi(async (req, ctx) => {
  await requireStudent();
  const { id } = await ctx.params;
  const r = await cafeStock(Array.isArray(id) ? id[0] : id);
  if (!r) throw notFound('Cafe not found.');
  const headers = { ETag: r.etag, 'Cache-Control': 'no-store' };
  if (req.headers.get('if-none-match') === r.etag) return new Response(null, { status: 304, headers });
  return NextResponse.json(r.body, { headers });
});

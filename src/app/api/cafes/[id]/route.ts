import { NextResponse } from 'next/server';
import { requireStudent } from '@/cafe/lib/rbac';
import { handleApi, notFound, type ApiContext } from '@/cafe/lib/api';
import { getCafeWithMenu } from '@/cafe/server/student';

export const GET = handleApi(async (req, ctx) => {
  await requireStudent();
  const { id } = await ctx.params;
  const cafe = await getCafeWithMenu(Array.isArray(id) ? id[0] : id);
  if (!cafe) return NextResponse.json({ error: 'Cafe not found.' }, { status: 404 });
  return NextResponse.json({ cafe });
});

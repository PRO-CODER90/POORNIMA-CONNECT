import { NextResponse } from 'next/server';
import { getSession } from '@/cafe/lib/auth';
import { prisma } from '@/cafe/lib/db';
import { handleApi, unauthorized } from '@/cafe/lib/api';

export const POST = handleApi(async () => {
  const session = await getSession();
  if (!session) throw unauthorized();
  await prisma.notification.updateMany({
    where: { userId: session.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
});

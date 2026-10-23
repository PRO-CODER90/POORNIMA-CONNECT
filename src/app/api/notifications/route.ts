import { NextResponse } from 'next/server';
import { getSession } from '@/cafe/lib/auth';
import { prisma } from '@/cafe/lib/db';
import { handleApi, unauthorized } from '@/cafe/lib/api';

export const GET = handleApi(async () => {
  const session = await getSession();
  if (!session) throw unauthorized();
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId: session.id }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.notification.count({ where: { userId: session.id, isRead: false } }),
  ]);
  return NextResponse.json({
    notifications: items.map((n) => ({
      id: n.id, title: n.title, message: n.message, type: n.type,
      isRead: n.isRead, createdAt: n.createdAt.toISOString(),
    })),
    unread,
  });
});

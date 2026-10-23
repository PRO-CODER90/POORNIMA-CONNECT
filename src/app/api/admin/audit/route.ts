import { NextResponse } from 'next/server';
import { requireAdmin } from '@/cafe/lib/rbac';
import { prisma } from '@/cafe/lib/db';
import { handleApi } from '@/cafe/lib/api';

export const GET = handleApi(async (req) => {
  await requireAdmin();
  const q = new URL(req.url).searchParams;
  const where = q.get('action') ? { action: q.get('action')! } : {};
  const logs = await prisma.auditLog.findMany({
    where,
    include: { user: { select: { email: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });
  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      metadata: l.metadata,
      user: l.user ? { email: l.user.email, role: l.user.role } : null,
      createdAt: l.createdAt.toISOString(),
    })),
  });
});

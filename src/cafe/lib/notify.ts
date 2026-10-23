import { prisma } from './db';

export type NotifyType = 'ORDER' | 'PAYMENT' | 'SYSTEM';

export async function notify(userId: string, title: string, message: string, type: NotifyType = 'ORDER') {
  try {
    await prisma.notification.create({ data: { userId, title, message, type } });
  } catch (e) {
    console.error('[notify] failed', e);
  }
}

/** Notify the student of an order. */
export async function notifyStudentForOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { student: { select: { userId: true } } },
  });
  return order?.student?.userId ?? null;
}

/** Notify all active staff users of a cafe. */
export async function notifyCafeStaff(cafeId: string, title: string, message: string, type: NotifyType = 'ORDER') {
  const staff = await prisma.cafeStaff.findMany({
    where: { assignedCafeId: cafeId },
    include: { user: { select: { id: true, isActive: true } } },
  });
  for (const s of staff) {
    if (s.user?.isActive) await notify(s.userId, title, message, type);
  }
}

/** Notify all active admin users. */
export async function notifyAdmins(title: string, message: string, type: NotifyType = 'SYSTEM') {
  const admins = await prisma.admin.findMany({
    include: { user: { select: { id: true, isActive: true } } },
  });
  for (const a of admins) {
    if (a.user?.isActive) await notify(a.userId, title, message, type);
  }
}

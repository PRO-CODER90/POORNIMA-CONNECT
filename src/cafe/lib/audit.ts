import { prisma } from './db';

export type AuditAction =
  | 'ADMIN_LOGIN'
  | 'STAFF_LOGIN'
  | 'STUDENT_LOGIN'
  | 'LOGOUT'
  | 'ORDER_CREATED'
  | 'ORDER_ACCEPTED'
  | 'ORDER_STATUS_CHANGED'
  | 'ORDER_CANCELLED'
  | 'CASH_RECEIVED'
  | 'MENU_ITEM_CREATED'
  | 'MENU_ITEM_UPDATED'
  | 'MENU_PRICE_CHANGED'
  | 'MENU_ITEM_DISABLED'
  | 'MENU_ITEM_DELETED'
  | 'CATEGORY_CREATED'
  | 'CATEGORY_UPDATED'
  | 'CATEGORY_DELETED'
  | 'CAFE_UPDATED'
  | 'STAFF_CREATED'
  | 'STAFF_UPDATED'
  | 'STAFF_DEACTIVATED'
  | 'STAFF_PASSWORD_RESET'
  | 'STUDENT_UPDATED'
  | 'STOCK_ADJUSTED'
  | 'ONLINE_PAYMENT_RECEIVED'
  | 'ONLINE_PAYMENT_REFUNDED'
  | 'ONLINE_REFUND_FAILED';

/** Fire-and-forget audit log entry (spec §62). */
export async function audit(
  userId: string | null,
  action: AuditAction,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (e) {
    console.error('[audit] failed to write', e);
  }
}

import { prisma } from '@/cafe/lib/db';
import { notFound, type ApiContext } from '@/cafe/lib/api';
import { requireAdmin, requireStaff } from '@/cafe/lib/rbac';
import type { InventoryScope } from './inventory';

export interface ScopedActor {
  scope: InventoryScope;
  cafeCode: string;
}

export async function param(ctx: ApiContext, key = 'id'): Promise<string> {
  const v = (await ctx.params)[key];
  return Array.isArray(v) ? v[0] : v;
}

/** Staff always work on their assigned cafe; any cafe id in the request is ignored. */
export async function staffScope(): Promise<ScopedActor> {
  const s = await requireStaff();
  return { scope: { cafeId: s.staff.assignedCafeId, actorUserId: s.session.id }, cafeCode: s.cafe.code };
}

export async function adminCafeScope(cafeId: string): Promise<ScopedActor> {
  const a = await requireAdmin();
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId }, select: { id: true, code: true } });
  if (!cafe) throw notFound('Cafe not found.');
  return { scope: { cafeId: cafe.id, actorUserId: a.session.id }, cafeCode: cafe.code };
}

export async function adminItemScope(itemId: string): Promise<ScopedActor> {
  const a = await requireAdmin();
  const item = await prisma.menuItem.findUnique({ where: { id: itemId }, select: { cafeId: true, cafe: { select: { code: true } } } });
  if (!item) throw notFound('Item not found.');
  return { scope: { cafeId: item.cafeId, actorUserId: a.session.id }, cafeCode: item.cafe.code };
}

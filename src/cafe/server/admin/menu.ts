import { prisma } from '@/cafe/lib/db';
import { ApiError } from '@/cafe/lib/api';
import { audit } from '@/cafe/lib/audit';
import type { AuthedAdmin } from '@/cafe/lib/rbac';

// ─────────────────────────────── cafe settings ───────────────────────────────

export async function adminUpdateCafe(admin: AuthedAdmin, cafeId: string, data: {
  name?: string; location?: string; description?: string; coverEmoji?: string; imageUrl?: string | null;
  openingTime?: string; closingTime?: string; manualStatus?: string | null; isActive?: boolean;
}) {
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!cafe) throw new ApiError(404, 'Cafe not found.');

  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) {
    const name = data.name.trim();
    if (name.length < 2) throw new ApiError(400, 'Cafe name is required.');
    payload.name = name;
  }
  if (data.location !== undefined) payload.location = data.location.trim();
  if (data.description !== undefined) payload.description = data.description.trim();
  if (data.coverEmoji !== undefined) payload.coverEmoji = data.coverEmoji.trim() || '☕';
  if (data.imageUrl !== undefined) payload.imageUrl = data.imageUrl || null;
  if (data.openingTime !== undefined) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(data.openingTime)) throw new ApiError(400, 'Opening time must be HH:MM (24h).');
    payload.openingTime = data.openingTime;
  }
  if (data.closingTime !== undefined) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(data.closingTime)) throw new ApiError(400, 'Closing time must be HH:MM (24h).');
    payload.closingTime = data.closingTime;
  }
  if (data.manualStatus !== undefined) {
    payload.manualStatus = data.manualStatus === 'OPEN' || data.manualStatus === 'CLOSED' ? data.manualStatus : null;
  }
  if (data.isActive !== undefined) payload.isActive = !!data.isActive;

  await prisma.cafe.update({ where: { id: cafeId }, data: payload });
  await audit(admin.session.id, 'CAFE_UPDATED', 'Cafe', cafeId, payload);
  return (await prisma.cafe.findUnique({ where: { id: cafeId } }))!;
}

// ─────────────────────────────── categories ───────────────────────────────

export async function adminListCategories(admin: AuthedAdmin, cafeId: string) {
  return prisma.category.findMany({
    where: { cafeId },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { items: { where: { isActive: true } } } } },
  });
}

export async function adminCreateCategory(admin: AuthedAdmin, cafeId: string, data: { name: string; description?: string; sortOrder?: number }) {
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!cafe) throw new ApiError(404, 'Cafe not found.');
  const name = (data.name ?? '').trim();
  if (name.length < 2 || name.length > 40) throw new ApiError(400, 'Category name must be 2-40 characters.');
  const existing = await prisma.category.findUnique({ where: { cafeId_name: { cafeId, name: name.toUpperCase() } } });
  if (existing) throw new ApiError(409, 'This category already exists for the cafe.');
  const maxOrder = await prisma.category.aggregate({ where: { cafeId }, _max: { sortOrder: true } });
  const cat = await prisma.category.create({
    data: { cafeId, name: name.toUpperCase(), description: (data.description ?? '').trim(), sortOrder: data.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1 },
  });
  await audit(admin.session.id, 'CATEGORY_CREATED', 'Category', cat.id, { cafe: cafe.code, name: cat.name });
  return cat;
}

export async function adminUpdateCategory(admin: AuthedAdmin, categoryId: string, data: { name?: string; description?: string; isActive?: boolean; sortOrder?: number }) {
  const cat = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!cat) throw new ApiError(404, 'Category not found.');
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) {
    const name = data.name.trim().toUpperCase();
    if (name.length < 2) throw new ApiError(400, 'Category name must be at least 2 characters.');
    payload.name = name;
  }
  if (data.description !== undefined) payload.description = data.description.trim();
  if (data.isActive !== undefined) payload.isActive = !!data.isActive;
  if (data.sortOrder !== undefined) payload.sortOrder = data.sortOrder;
  const updated = await prisma.category.update({ where: { id: categoryId }, data: payload });
  await audit(admin.session.id, 'CATEGORY_UPDATED', 'Category', categoryId, payload);
  return updated;
}

export async function adminDeleteCategory(admin: AuthedAdmin, categoryId: string) {
  const cat = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { _count: { select: { items: { where: { isActive: true } } } } },
  });
  if (!cat) throw new ApiError(404, 'Category not found.');
  if (cat._count.items > 0) {
    // Deactivate instead of hard-delete when items exist (keeps history intact).
    await prisma.category.update({ where: { id: categoryId }, data: { isActive: false } });
    await audit(admin.session.id, 'CATEGORY_DELETED', 'Category', categoryId, { deactivated: true });
    return { deactivated: true };
  }
  await prisma.category.delete({ where: { id: categoryId } });
  await audit(admin.session.id, 'CATEGORY_DELETED', 'Category', categoryId, { hardDeleted: true });
  return { deleted: true };
}

// Menu items and stock: see ../inventory.ts (shared with the staff Inventory page).

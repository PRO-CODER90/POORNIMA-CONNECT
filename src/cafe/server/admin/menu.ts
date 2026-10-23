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

// ─────────────────────────────── menu items ───────────────────────────────

export async function adminListMenu(admin: AuthedAdmin, cafeId: string) {
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!cafe) throw new ApiError(404, 'Cafe not found.');
  const [items, categories] = await Promise.all([
    prisma.menuItem.findMany({
      where: { cafeId },
      orderBy: [{ createdAt: 'asc' }],
      include: { category: { select: { id: true, name: true } } },
    }),
    prisma.category.findMany({ where: { cafeId, isActive: true }, orderBy: { sortOrder: 'asc' } }),
  ]);
  return { cafe: { id: cafe.id, code: cafe.code, name: cafe.name }, items, categories };
}

export async function adminCreateItem(admin: AuthedAdmin, cafeId: string, data: {
  name: string; description?: string; price: number; emoji?: string; categoryId: string; isAvailable?: boolean; imageUrl?: string | null;
}) {
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!cafe) throw new ApiError(404, 'Cafe not found.');
  const name = (data.name ?? '').trim();
  if (name.length < 2) throw new ApiError(400, 'Item name is required.');
  const price = Math.round(Number(data.price));
  if (!Number.isInteger(price) || price < 1 || price > 100000) throw new ApiError(400, 'Price must be a whole number of rupees (1–1,00,000).');
  const cat = await prisma.category.findFirst({ where: { id: data.categoryId, cafeId, isActive: true } });
  if (!cat) throw new ApiError(400, 'Choose a valid category for this cafe.');

  const item = await prisma.menuItem.create({
    data: { cafeId, categoryId: cat.id, name, description: (data.description ?? '').trim(), price, emoji: (data.emoji ?? '').trim() || '🍽️', imageUrl: data.imageUrl ?? null, isAvailable: data.isAvailable ?? true },
    include: { category: { select: { id: true, name: true } } },
  });
  await audit(admin.session.id, 'MENU_ITEM_CREATED', 'MenuItem', item.id, { cafe: cafe.code, name, price });
  return item;
}

export async function adminUpdateItem(admin: AuthedAdmin, itemId: string, data: {
  name?: string; description?: string; price?: number; emoji?: string; categoryId?: string; isAvailable?: boolean; isActive?: boolean; imageUrl?: string | null;
}) {
  const item = await prisma.menuItem.findUnique({ where: { id: itemId } });
  if (!item) throw new ApiError(404, 'Menu item not found.');
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) {
    const name = data.name.trim();
    if (name.length < 2) throw new ApiError(400, 'Item name is required.');
    payload.name = name;
  }
  if (data.description !== undefined) payload.description = data.description.trim();
  if (data.price !== undefined) {
    const price = Math.round(Number(data.price));
    if (!Number.isInteger(price) || price < 1 || price > 100000) throw new ApiError(400, 'Price must be a whole number of rupees (1–1,00,000).');
    payload.price = price;
  }
  if (data.emoji !== undefined) payload.emoji = data.emoji.trim() || '🍽️';
  if (data.categoryId !== undefined && data.categoryId !== item.categoryId) {
    const cat = await prisma.category.findFirst({ where: { id: data.categoryId, cafeId: item.cafeId, isActive: true } });
    if (!cat) throw new ApiError(400, 'Choose a valid category for this cafe.');
    payload.categoryId = cat.id;
  }
  if (data.isAvailable !== undefined) payload.isAvailable = !!data.isAvailable;
  if (data.isActive !== undefined) payload.isActive = !!data.isActive;
  if (data.imageUrl !== undefined) payload.imageUrl = data.imageUrl || null;

  const updated = await prisma.menuItem.update({ where: { id: itemId }, data: payload });
  const priceChanged = data.price !== undefined && data.price !== item.price;
  await audit(
    admin.session.id,
    priceChanged ? 'MENU_PRICE_CHANGED' : 'MENU_ITEM_UPDATED',
    'MenuItem',
    itemId,
    priceChanged ? { from: item.price, to: payload.price as number } : payload,
  );
  if (data.isAvailable === false) {
    await audit(admin.session.id, 'MENU_ITEM_DISABLED', 'MenuItem', itemId, { name: item.name });
  }
  return updated;
}

export async function adminDeleteItem(admin: AuthedAdmin, itemId: string) {
  const item = await prisma.menuItem.findUnique({ where: { id: itemId } });
  if (!item) throw new ApiError(404, 'Menu item not found.');
  await prisma.menuItem.update({ where: { id: itemId }, data: { isActive: false, isAvailable: false } });
  await audit(admin.session.id, 'MENU_ITEM_DELETED', 'MenuItem', itemId, { name: item.name, softDeleted: true });
  return { deleted: true };
}

// Menu items, packet stock and categories for ONE cafe. Staff call these with their own cafe
// (from the session, never the request); admin calls them with the cafe it is managing.
// Items of another cafe are reported as "not found" so their ids are not revealed.
import { Prisma } from '@prisma/client';
import { prisma } from '@/cafe/lib/db';
import { ApiError, badRequest, conflict, notFound } from '@/cafe/lib/api';
import { audit } from '@/cafe/lib/audit';
import { demoImageFor, isDemoImage, stockState, type StockKind } from '@/cafe/lib/stock';
import { parseItem, stockAdjustSchema, type ItemInput } from '@/cafe/lib/menuItemSchema';
import { adjustStock, recordInitialStock, StockError } from '@/cafe/lib/stockSql';
import { removeImageIfUnused } from '@/cafe/lib/imageStorage';
import { prismaQ } from './orders';

export interface InventoryScope {
  cafeId: string;
  /** cafe "User".id of the staff member or admin, for audit and stock history. */
  actorUserId: string;
}

export class FieldErrors extends ApiError {
  constructor(fields: Record<string, string>) {
    super(400, Object.values(fields)[0] ?? 'Check the form.');
    this.fields = fields;
  }
}

const itemInclude = { category: { select: { id: true, name: true } } } satisfies Prisma.MenuItemInclude;
type ItemRow = Prisma.MenuItemGetPayload<{ include: typeof itemInclude }>;

export interface InventoryItemDto {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  itemType: string;
  price: number;
  mrp: number | null;
  isVeg: boolean;
  packSize: string | null;
  sku: string | null;
  stockQty: number | null;
  lowStockThreshold: number;
  expiryDate: string | null;
  imageUrl: string;
  isDemoImage: boolean;
  isAvailable: boolean;
  isActive: boolean;
  stock: StockKind;
  updatedAt: string;
}

export function toInventoryDto(m: ItemRow): InventoryItemDto {
  return {
    id: m.id,
    name: m.name,
    description: m.description,
    categoryId: m.categoryId,
    categoryName: m.category.name,
    itemType: m.itemType,
    price: m.price,
    mrp: m.mrp,
    isVeg: m.isVeg,
    packSize: m.packSize,
    sku: m.sku,
    stockQty: m.stockQty,
    lowStockThreshold: m.lowStockThreshold,
    expiryDate: m.expiryDate ? m.expiryDate.toISOString().slice(0, 10) : null,
    imageUrl: m.imageUrl || demoImageFor(m.category.name, m.itemType),
    isDemoImage: isDemoImage(m.imageUrl),
    isAvailable: m.isAvailable,
    isActive: m.isActive,
    stock: stockState(m).kind,
    updatedAt: m.updatedAt.toISOString(),
  };
}

export async function listInventory(cafeId: string) {
  const [items, categories] = await Promise.all([
    prisma.menuItem.findMany({ where: { cafeId }, include: itemInclude, orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }] }),
    prisma.category.findMany({ where: { cafeId, isActive: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
  ]);
  const dtos = items.map(toInventoryDto);
  const active = dtos.filter((i) => i.isActive);
  return {
    items: dtos,
    categories,
    counts: {
      total: active.length,
      packetsInStock: active.filter((i) => i.itemType === 'PACKET' && (i.stock === 'OK' || i.stock === 'LOW')).length,
      low: active.filter((i) => i.stock === 'LOW').length,
      out: active.filter((i) => i.stock === 'OUT').length,
    },
  };
}

async function findItem(scope: InventoryScope, id: string) {
  const item = await prisma.menuItem.findFirst({ where: { id, cafeId: scope.cafeId }, include: itemInclude });
  if (!item) throw notFound('Item not found.');
  return item;
}

async function assertCategory(scope: InventoryScope, categoryId: string) {
  const cat = await prisma.category.findFirst({ where: { id: categoryId, cafeId: scope.cafeId, isActive: true } });
  if (!cat) throw new FieldErrors({ categoryId: 'Choose a category of this cafe.' });
  return cat;
}

async function assertUniqueName(scope: InventoryScope, name: string, exceptId?: string) {
  const clash = await prisma.menuItem.findFirst({
    where: { cafeId: scope.cafeId, isActive: true, name: { equals: name, mode: 'insensitive' }, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true },
  });
  if (clash) throw new FieldErrors({ name: 'Another item in this cafe already has this name.' });
}

const skuClash = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';

function columns(v: ItemInput) {
  const packet = v.itemType === 'PACKET';
  return {
    name: v.name,
    categoryId: v.categoryId,
    description: v.description,
    itemType: v.itemType,
    price: v.price,
    isVeg: v.isVeg,
    mrp: packet ? v.mrp : null,
    packSize: packet ? v.packSize : null,
    sku: packet ? v.sku : null,
    lowStockThreshold: v.lowStockThreshold,
    expiryDate: packet && v.expiryDate ? new Date(`${v.expiryDate}T00:00:00+05:30`) : null,
    imageUrl: v.imageUrl,
    isAvailable: v.isAvailable,
  };
}

export async function createItem(scope: InventoryScope, raw: unknown) {
  const p = parseItem(raw, true);
  if (!p.ok) throw new FieldErrors(p.errors);
  const v = p.value;
  const cat = await assertCategory(scope, v.categoryId);
  await assertUniqueName(scope, v.name);
  const data = columns(v);
  if (!data.imageUrl) data.imageUrl = demoImageFor(cat.name, v.itemType);
  try {
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.menuItem.create({
        data: { ...data, cafeId: scope.cafeId, stockQty: v.itemType === 'PACKET' ? v.stockQty : null },
        include: itemInclude,
      });
      if (created.itemType === 'PACKET') {
        await recordInitialStock(prismaQ(tx), { menuItemId: created.id, cafeId: scope.cafeId, qty: created.stockQty ?? 0, actorUserId: scope.actorUserId });
      }
      return created;
    });
    await audit(scope.actorUserId, 'MENU_ITEM_CREATED', 'MenuItem', item.id, { name: item.name, price: item.price, itemType: item.itemType });
    return toInventoryDto(item);
  } catch (e) {
    if (skuClash(e)) throw new FieldErrors({ sku: 'This SKU is already used in this cafe.' });
    throw e;
  }
}

/**
 * Full edit from the item form. Stock is NOT typed over here (use adjustItemStock, which leaves a
 * reason), except the first count when an item becomes a packet. A body with only `isAvailable`
 * is the quick show/hide switch.
 */
export async function updateItem(scope: InventoryScope, id: string, raw: unknown) {
  const item = await findItem(scope, id);
  const body = (raw ?? {}) as Record<string, unknown>;

  if (Object.keys(body).length === 1 && typeof body.isAvailable === 'boolean') {
    const updated = await prisma.menuItem.update({ where: { id }, data: { isAvailable: body.isAvailable }, include: itemInclude });
    await audit(scope.actorUserId, body.isAvailable ? 'MENU_ITEM_UPDATED' : 'MENU_ITEM_DISABLED', 'MenuItem', id, { isAvailable: body.isAvailable });
    return toInventoryDto(updated);
  }

  const becomesPacket = item.itemType !== 'PACKET' && body.itemType === 'PACKET';
  const p = parseItem({ ...body, stockQty: becomesPacket ? body.stockQty : null }, becomesPacket);
  if (!p.ok) throw new FieldErrors(p.errors);
  const v = p.value;
  if (v.categoryId !== item.categoryId) await assertCategory(scope, v.categoryId);
  if (v.name.toLowerCase() !== item.name.toLowerCase()) await assertUniqueName(scope, v.name, id);
  const data = columns(v);
  if (!data.imageUrl) data.imageUrl = demoImageFor(item.category.name, v.itemType);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const stockQty = v.itemType === 'PACKET' ? (becomesPacket ? v.stockQty : item.stockQty ?? 0) : null;
      const u = await tx.menuItem.update({ where: { id }, data: { ...data, stockQty }, include: itemInclude });
      if (becomesPacket) await recordInitialStock(prismaQ(tx), { menuItemId: id, cafeId: scope.cafeId, qty: stockQty ?? 0, actorUserId: scope.actorUserId });
      return u;
    });
    if (v.price !== item.price) await audit(scope.actorUserId, 'MENU_PRICE_CHANGED', 'MenuItem', id, { from: item.price, to: v.price });
    await audit(scope.actorUserId, 'MENU_ITEM_UPDATED', 'MenuItem', id, { name: v.name, itemType: v.itemType });
    if (item.imageUrl !== updated.imageUrl) {
      await removeImageIfUnused(item.imageUrl, async (url) => (await prisma.menuItem.count({ where: { imageUrl: url } })) > 0);
    }
    return toInventoryDto(updated);
  } catch (e) {
    if (skuClash(e)) throw new FieldErrors({ sku: 'This SKU is already used in this cafe.' });
    throw e;
  }
}

/** Archive, never hard-delete: past orders point at the item. */
export async function archiveItem(scope: InventoryScope, id: string) {
  const item = await findItem(scope, id);
  const updated = await prisma.menuItem.update({ where: { id }, data: { isActive: false, isAvailable: false }, include: itemInclude });
  await audit(scope.actorUserId, 'MENU_ITEM_DELETED', 'MenuItem', id, { name: item.name, archived: true });
  return toInventoryDto(updated);
}

export async function restoreItem(scope: InventoryScope, id: string) {
  const item = await findItem(scope, id);
  await assertUniqueName(scope, item.name, id);
  const updated = await prisma.menuItem.update({ where: { id }, data: { isActive: true }, include: itemInclude });
  await audit(scope.actorUserId, 'MENU_ITEM_UPDATED', 'MenuItem', id, { restored: true });
  return toInventoryDto(updated);
}

export async function adjustItemStock(scope: InventoryScope, id: string, raw: unknown) {
  await findItem(scope, id);
  const r = stockAdjustSchema.safeParse(raw);
  if (!r.success) {
    const fields: Record<string, string> = {};
    for (const i of r.error.issues) fields[String(i.path[0] ?? 'form')] ??= i.message;
    throw new FieldErrors(fields);
  }
  try {
    const res = await prisma.$transaction((tx) =>
      adjustStock(prismaQ(tx), { menuItemId: id, cafeId: scope.cafeId, ...r.data, actorUserId: scope.actorUserId }),
    );
    await audit(scope.actorUserId, 'STOCK_ADJUSTED', 'MenuItem', id, { mode: r.data.mode, reason: r.data.reason, from: res.before, to: res.after });
    return toInventoryDto(await findItem(scope, id));
  } catch (e) {
    if (e instanceof StockError) throw conflict(e.message);
    throw e;
  }
}

export async function listMovements(scope: InventoryScope, id: string, limit = 50) {
  await findItem(scope, id);
  const rows = await prisma.stockMovement.findMany({ where: { menuItemId: id }, orderBy: { createdAt: 'desc' }, take: Math.min(Math.max(limit, 1), 200) });
  const orderIds = [...new Set(rows.map((r) => r.orderId).filter((x): x is string => !!x))];
  const userIds = [...new Set(rows.map((r) => r.actorUserId).filter((x): x is string => !!x))];
  const [orders, users] = await Promise.all([
    prisma.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, orderNumber: true } }),
    prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true, cafeStaff: { select: { name: true } }, admin: { select: { name: true } } } }),
  ]);
  return rows.map((r) => {
    const u = users.find((x) => x.id === r.actorUserId);
    return {
      id: r.id,
      at: r.createdAt.toISOString(),
      delta: r.delta,
      qtyAfter: r.qtyAfter,
      reason: r.reason,
      note: r.note,
      orderNumber: orders.find((o) => o.id === r.orderId)?.orderNumber ?? null,
      by: u ? (u.cafeStaff?.name ?? u.admin?.name ?? u.email) : null,
    };
  });
}

export async function createCategory(scope: InventoryScope, raw: unknown) {
  const name = String((raw as { name?: unknown })?.name ?? '').trim().toUpperCase();
  if (name.length < 2 || name.length > 40) throw new FieldErrors({ name: 'Category name must be 2-40 characters.' });
  const existing = await prisma.category.findUnique({ where: { cafeId_name: { cafeId: scope.cafeId, name } } });
  if (existing?.isActive) throw badRequest('This category already exists.');
  const max = await prisma.category.aggregate({ where: { cafeId: scope.cafeId }, _max: { sortOrder: true } });
  const cat = existing
    ? await prisma.category.update({ where: { id: existing.id }, data: { isActive: true } })
    : await prisma.category.create({ data: { cafeId: scope.cafeId, name, sortOrder: (max._max.sortOrder ?? -1) + 1 } });
  await audit(scope.actorUserId, 'CATEGORY_CREATED', 'Category', cat.id, { name });
  return { id: cat.id, name: cat.name };
}

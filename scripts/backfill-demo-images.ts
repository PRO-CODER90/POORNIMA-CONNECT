// Gives every menu item without a photo its category's demo image. Never overwrites an upload.
// Safe to re-run.  npm run db:backfill:images
import { PrismaClient } from '@prisma/client';
import { demoImageFor } from '../src/cafe/lib/stock';

const prisma = new PrismaClient();

async function main() {
  const items = await prisma.menuItem.findMany({
    where: { OR: [{ imageUrl: null }, { imageUrl: '' }] },
    select: { id: true, itemType: true, category: { select: { name: true } } },
  });
  for (const i of items) {
    await prisma.menuItem.update({ where: { id: i.id }, data: { imageUrl: demoImageFor(i.category.name, i.itemType) } });
  }
  console.log(`Demo images set on ${items.length} item(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

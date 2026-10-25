// Checks every packet: stockQty must equal the sum of its stock movements since its last INITIAL.
// Exits 1 and lists the items that differ.  npm run verify:stock
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRaw<{ id: string; name: string; stockQty: number; ledger: number | null }[]>`
    SELECT m.id, m.name, m."stockQty",
           (SELECT SUM(s.delta)::int FROM "StockMovement" s
             WHERE s."menuItemId" = m.id
               AND s."createdAt" >= COALESCE((SELECT MAX(i."createdAt") FROM "StockMovement" i
                                               WHERE i."menuItemId" = m.id AND i.reason = 'INITIAL'), 'epoch')) AS ledger
      FROM "MenuItem" m WHERE m."itemType" = 'PACKET'`;
  const bad = rows.filter((r) => (r.ledger ?? 0) !== r.stockQty);
  for (const r of bad) console.log(`MISMATCH ${r.name} (${r.id}): stock ${r.stockQty}, movements ${r.ledger ?? 0}`);
  console.log(`${rows.length} packet(s) checked, ${bad.length} mismatch(es).`);
  if (bad.length) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

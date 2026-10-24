/* eslint-disable no-console */
// Wipes student/faculty order history so every account opens on a clean, zero state.
// Accounts, profiles, cafes and menus are never touched.
//
//   npm run db:reset:students                         dry run: prints what would be deleted
//   npm run db:reset:students -- --confirm            deletes
//   ... --student 20070 --student 18915               only these student codes
//   ... --include-audit                               also AuditLog rows for Order/Payment
//   ... --i-know-this-is-production                   required when NODE_ENV=production
//
// Take a backup first: pg_dump "$DATABASE_URL" > backup-$(date +%F).sql   (deletion is irreversible)
import { PrismaClient } from '@prisma/client';

const args = process.argv.slice(2);
const confirm = args.includes('--confirm');
const includeAudit = args.includes('--include-audit');
const prodOk = args.includes('--i-know-this-is-production');
const codes = args.flatMap((a, i) => (a === '--student' && args[i + 1] ? [args[i + 1].trim()] : []));

const known = new Set(['--confirm', '--include-audit', '--i-know-this-is-production', '--student']);
const unknown = args.filter((a, i) => a.startsWith('--') && !known.has(a) && args[i - 1] !== '--student');
if (unknown.length) {
  console.error(`Unknown option(s): ${unknown.join(' ')}`);
  process.exit(1);
}
if (args.includes('--student') && codes.length === 0) {
  console.error('--student needs a student code, e.g. --student 20070');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' && !prodOk) {
  console.error('NODE_ENV=production: refusing to run without --i-know-this-is-production.');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const host = (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? '').host;
    } catch {
      return '(DATABASE_URL not set)';
    }
  })();
  console.log(`Database: ${host}`);
  console.log(`Scope:    ${codes.length ? `student codes ${codes.join(', ')}` : 'ALL students and faculty'}`);

  if (codes.length) {
    const found = await prisma.student.findMany({ where: { studentCode: { in: codes } }, select: { studentCode: true } });
    const missing = codes.filter((c) => !found.some((f) => f.studentCode === c));
    if (missing.length) console.warn(`No student profile for: ${missing.join(', ')} (skipped)`);
  }

  const orderWhere = codes.length ? { student: { studentCode: { in: codes } } } : {};
  const ids = (await prisma.order.findMany({ where: orderWhere, select: { id: true } })).map((o) => o.id);
  const notificationWhere = codes.length
    ? { user: { role: 'STUDENT', student: { studentCode: { in: codes } } } }
    : { user: { role: 'STUDENT' } };
  const auditWhere = {
    entityType: { in: ['Order', 'Payment'] },
    ...(codes.length ? { entityId: { in: ids } } : {}),
  };

  const counts = async () => ({
    Payment: await prisma.payment.count({ where: { orderId: { in: ids } } }),
    OrderItem: await prisma.orderItem.count({ where: { orderId: { in: ids } } }),
    Order: await prisma.order.count({ where: { id: { in: ids } } }),
    Notification: await prisma.notification.count({ where: notificationWhere }),
    ...(includeAudit ? { AuditLog: await prisma.auditLog.count({ where: auditWhere }) } : {}),
  });

  const before = await counts();
  console.log(confirm ? '\nRows to delete:' : '\nDry run. Rows that --confirm would delete:');
  console.table(before);

  if (!confirm) {
    console.log('Nothing was deleted. Re-run with --confirm to delete.');
    return;
  }

  // FK order: Payment → OrderItem → Order → Notification (→ AuditLog). All or nothing.
  await prisma.$transaction([
    prisma.payment.deleteMany({ where: { orderId: { in: ids } } }),
    prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } }),
    prisma.order.deleteMany({ where: { id: { in: ids } } }),
    prisma.notification.deleteMany({ where: notificationWhere }),
    ...(includeAudit ? [prisma.auditLog.deleteMany({ where: auditWhere })] : []),
  ]);

  console.log('\nDone. Remaining rows in scope:');
  console.table(await counts());
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

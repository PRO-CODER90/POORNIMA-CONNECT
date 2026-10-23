// Bridges the portal login to CafeConnect. There is no separate cafe login: the portal session
// (src/lib/auth.ts) identifies the person, and this maps them to their cafe-side account.
//
//   portal role student / faculty  -> STUDENT     (account + student profile created on first visit)
//   portal role staff               -> CAFE_STAFF  (created by an admin in Admin > Staff)
//   portal role admin               -> ADMIN       (admin profile created on first visit)
import { getSession as getPortalSession } from '@/lib/auth';
import { randomUUID } from 'node:crypto';
import { prisma } from './db';

export interface SessionUser {
  id: string; // cafe "User".id
  role: 'STUDENT' | 'CAFE_STAFF' | 'ADMIN';
  email: string;
}

const ROLE_FROM_PORTAL: Record<string, SessionUser['role']> = {
  student: 'STUDENT',
  faculty: 'STUDENT',
  staff: 'CAFE_STAFF',
  admin: 'ADMIN',
};

export async function getSession(): Promise<SessionUser | null> {
  const portal = await getPortalSession();
  if (!portal) return null;
  const role = ROLE_FROM_PORTAL[portal.role];
  if (!role) return null;
  const email = portal.email.trim().toLowerCase();

  let user = await prisma.user.findUnique({ where: { portalUserId: portal.uid } });

  if (!user) {
    // Staff accounts are created by an admin together with their cafe assignment.
    if (role === 'CAFE_STAFF') return null;
    // Account + profile in ONE statement. A first visit fires several requests at once (layout, page,
    // API); ON CONFLICT makes the extra ones wait for the first and then do nothing, so there is never
    // a half-created account and nothing is logged as an error.
    const userId = randomUUID();
    if (role === 'STUDENT') {
      await prisma.$executeRaw`
        WITH u AS (
          INSERT INTO "User" ("id", "portalUserId", "email", "role", "updatedAt")
          VALUES (${userId}, ${portal.uid}, ${email}, 'STUDENT', now())
          ON CONFLICT DO NOTHING RETURNING "id")
        INSERT INTO "Student" ("id", "userId", "studentCode", "name", "email", "department", "course", "year", "updatedAt")
        SELECT ${randomUUID()}, u."id", ${portal.enrollmentNo}, ${portal.name}, ${email}, '', '', 1, now() FROM u`;
    } else {
      await prisma.$executeRaw`
        WITH u AS (
          INSERT INTO "User" ("id", "portalUserId", "email", "role", "updatedAt")
          VALUES (${userId}, ${portal.uid}, ${email}, 'ADMIN', now())
          ON CONFLICT DO NOTHING RETURNING "id")
        INSERT INTO "Admin" ("id", "userId", "name", "updatedAt")
        SELECT ${randomUUID()}, u."id", ${portal.name}, now() FROM u`;
    }
    user = await prisma.user.findUnique({ where: { portalUserId: portal.uid } });
    if (!user) return null;
  } else if (user.email !== email || user.role !== role) {
    // Keep the cafe copy in step with the portal account (email or role changed there).
    if (user.role !== role) return null; // role changes need an admin to set up the matching profile
    user = await prisma.user.update({ where: { id: user.id }, data: { email } });
  }

  // Fail closed if the cafe account was deactivated by an admin.
  if (!user.isActive) return null;
  if (!user.lastLogin || Date.now() - user.lastLogin.getTime() > 10 * 60 * 1000) {
    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
  }
  return { id: user.id, role, email };
}

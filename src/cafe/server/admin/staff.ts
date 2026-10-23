import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { checkPasswordPolicy } from '@/lib/password';
import { ERRORS } from '@/lib/errors';
import { prisma } from '@/cafe/lib/db';
import { ApiError } from '@/cafe/lib/api';
import { audit } from '@/cafe/lib/audit';
import type { AuthedAdmin } from '@/cafe/lib/rbac';

const STAFF_CODE_PREFIX = 'STF';

// Staff sign in through the portal login with their staff code (e.g. STF001) as login ID, so their
// password lives in the portal's users table, not here.
function assertPortalPassword(password: string, email: string, staffCode: string) {
  const problem = checkPasswordPolicy(password, email, staffCode);
  if (problem) throw new ApiError(400, ERRORS[problem].message);
}

/** CAFE STAFF management list (spec §35). */
export async function adminStaffList(admin: AuthedAdmin) {
  const staff = await prisma.cafeStaff.findMany({
    include: {
      user: { select: { email: true, isActive: true, lastLogin: true } },
      cafe: { select: { id: true, code: true, name: true } },
    },
    orderBy: { staffCode: 'asc' },
  });
  return staff.map((s) => ({
    id: s.id,
    staffCode: s.staffCode,
    name: s.name,
    email: s.user.email,
    cafe: s.cafe,
    status: (s.user.isActive ? 'ACTIVE' : 'DEACTIVATED') as 'ACTIVE' | 'DEACTIVATED',
    lastLogin: s.user.lastLogin?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
  }));
}

export async function adminAddStaff(admin: AuthedAdmin, data: { name: string; email: string; password: string; cafeId: string }) {
  const name = (data.name ?? '').trim();
  const email = (data.email ?? '').trim().toLowerCase();
  const password = data.password ?? '';
  const cafeId = data.cafeId ?? '';
  if (name.length < 2) throw new ApiError(400, 'Staff name is required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'Valid email required.');
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId } });
  if (!cafe || !cafe.isActive) throw new ApiError(400, 'Choose an active cafe for this staff member.');
  const sql = getDb();
  const [{ taken }] = await sql<{ taken: boolean }[]>`SELECT EXISTS (SELECT 1 FROM users WHERE email = ${email}) AS taken`;
  if (taken || (await prisma.user.findUnique({ where: { email } }))) throw new ApiError(409, 'A user with this email already exists.');

  const count = await prisma.cafeStaff.count();
  const staffCode = `${STAFF_CODE_PREFIX}${String(count + 1).padStart(3, '0')}`;
  assertPortalPassword(password, email, staffCode);

  const [portal] = await sql<{ id: number }[]>`
    INSERT INTO users (role, enrollment_no, name, email, password_hash, password_set_at)
    VALUES ('staff', ${staffCode}, ${name}, ${email}, ${await bcrypt.hash(password, 12)}, now())
    RETURNING id`;
  const user = await prisma.user.create({
    data: { portalUserId: portal.id, email, role: 'CAFE_STAFF' },
  });
  const staff = await prisma.cafeStaff.create({
    data: { userId: user.id, staffCode, name, assignedCafeId: cafe.id },
    include: { cafe: { select: { code: true, name: true } } },
  });
  await audit(admin.session.id, 'STAFF_CREATED', 'CafeStaff', staff.id, { staffCode, cafe: cafe.code, name });
  return { id: staff.id, staffCode: staff.staffCode, name: staff.name, cafe: staff.cafe };
}

export async function adminUpdateStaff(admin: AuthedAdmin, staffId: string, data: { name?: string; cafeId?: string }) {
  const staff = await prisma.cafeStaff.findUnique({ where: { id: staffId }, include: { user: true } });
  if (!staff) throw new ApiError(404, 'Staff member not found.');
  const payload: { name?: string; assignedCafeId?: string } = {};
  if (data.name !== undefined) {
    const name = data.name.trim();
    if (name.length < 2) throw new ApiError(400, 'Staff name is required.');
    payload.name = name;
  }
  if (data.cafeId !== undefined && data.cafeId !== staff.assignedCafeId) {
    const cafe = await prisma.cafe.findUnique({ where: { id: data.cafeId } });
    if (!cafe) throw new ApiError(400, 'Choose a valid cafe.');
    payload.assignedCafeId = cafe.id;
  }
  const updated = await prisma.cafeStaff.update({ where: { id: staffId }, data: payload });
  await audit(admin.session.id, 'STAFF_UPDATED', 'CafeStaff', staffId, { name: payload.name, cafeId: payload.assignedCafeId });
  return updated;
}

export async function adminSetStaffActive(admin: AuthedAdmin, staffId: string, isActive: boolean) {
  const staff = await prisma.cafeStaff.findUnique({ where: { id: staffId } });
  if (!staff) throw new ApiError(404, 'Staff member not found.');
  const user = await prisma.user.update({ where: { id: staff.userId }, data: { isActive } });
  // End their current sessions right away.
  if (!isActive && user.portalUserId) await getDb()`UPDATE users SET token_version = token_version + 1 WHERE id = ${user.portalUserId}`;
  await audit(admin.session.id, isActive ? 'STAFF_UPDATED' : 'STAFF_DEACTIVATED', 'CafeStaff', staffId, { isActive });
}

export async function adminResetStaffPassword(admin: AuthedAdmin, staffId: string, newPassword: string) {
  const staff = await prisma.cafeStaff.findUnique({ where: { id: staffId }, include: { user: true } });
  if (!staff) throw new ApiError(404, 'Staff member not found.');
  if (!staff.user.portalUserId) throw new ApiError(400, 'This staff member has no portal login.');
  assertPortalPassword(newPassword, staff.user.email, staff.staffCode);
  // New password on the portal login; ends their other sessions.
  await getDb()`UPDATE users SET password_hash = ${await bcrypt.hash(newPassword, 12)}, password_set_at = now(),
                  token_version = token_version + 1 WHERE id = ${staff.user.portalUserId}`;
  await audit(admin.session.id, 'STAFF_PASSWORD_RESET', 'CafeStaff', staffId);
}

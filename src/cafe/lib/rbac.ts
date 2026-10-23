// Server-side role guards. Every API handler MUST call one of these —
// frontend route protection is never the only check (spec §64).
import { redirect } from 'next/navigation';
import { prisma } from './db';
import { forbidden, notFound, unauthorized } from './api';
import { getSession as getPortalSession } from '@/lib/auth';
import { getSession, type SessionUser } from './auth';

export interface AuthedStudent {
  session: SessionUser;
  student: { id: string; studentCode: string; name: string; email: string; userId: string };
}

export interface AuthedStaff {
  session: SessionUser;
  staff: { id: string; staffCode: string; name: string; assignedCafeId: string; userId: string };
  cafe: { id: string; code: string; name: string; coverEmoji: string };
}

export interface AuthedAdmin {
  session: SessionUser;
  admin: { id: string; name: string; userId: string };
}

export async function requireStudent(): Promise<AuthedStudent> {
  const session = await getSession();
  if (!session) throw unauthorized();
  if (session.role !== 'STUDENT') throw forbidden();
  const student = await prisma.student.findUnique({
    where: { userId: session.id },
    select: { id: true, studentCode: true, name: true, email: true, userId: true },
  });
  if (!student) throw notFound('Student profile not found');
  return { session, student };
}

export async function requireStaff(): Promise<AuthedStaff> {
  const session = await getSession();
  if (!session) throw unauthorized();
  if (session.role !== 'CAFE_STAFF') throw forbidden();
  const staff = await prisma.cafeStaff.findUnique({
    where: { userId: session.id },
    include: { cafe: { select: { id: true, code: true, name: true, coverEmoji: true } } },
  });
  if (!staff) throw notFound('Staff profile not found');
  return { session, staff: { id: staff.id, staffCode: staff.staffCode, name: staff.name, assignedCafeId: staff.assignedCafeId, userId: staff.userId }, cafe: staff.cafe };
}

export async function requireAdmin(): Promise<AuthedAdmin> {
  const session = await getSession();
  if (!session) throw unauthorized();
  if (session.role !== 'ADMIN') throw forbidden();
  const admin = await prisma.admin.findUnique({ where: { userId: session.id } });
  if (!admin) throw notFound('Admin profile not found');
  return { session, admin: { id: admin.id, name: admin.name, userId: admin.userId } };
}

/**
 * Cafe-scope guard for staff (spec §36): the requested cafe must be the
 * staff member's assigned cafe — never trust the client's cafe choice.
 */
export function assertStaffCafe(staff: AuthedStaff['staff'], cafeId: string) {
  if (staff.assignedCafeId !== cafeId) {
    throw forbidden('You can only access orders for your assigned cafe');
  }
}

// ── page-level guards: verify session and redirect on failure ──
// Not signed in -> the portal login ("/"). Signed in but no access here (wrong role, cafe account not
// set up or deactivated) -> the portal dashboard, which explains it instead of redirecting again.

async function failRedirect(): Promise<never> {
  return redirect((await getPortalSession()) ? '/dashboard?noaccess=1' : '/');
}

export async function requireStudentPage(): Promise<AuthedStudent> {
  try {
    return await requireStudent();
  } catch {
    return failRedirect();
  }
}

export async function requireStaffPage(): Promise<AuthedStaff> {
  try {
    return await requireStaff();
  } catch {
    return failRedirect();
  }
}

export async function requireAdminPage(): Promise<AuthedAdmin> {
  try {
    return await requireAdmin();
  } catch {
    return failRedirect();
  }
}

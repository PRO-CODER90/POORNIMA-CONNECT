import { NextResponse } from 'next/server';
import { requireStudent } from '@/cafe/lib/rbac';
import { handleApi, readBody, badRequest } from '@/cafe/lib/api';
import { updateProfile } from '@/cafe/server/student';

export const GET = handleApi(async () => {
  const auth = await requireStudent();
  return NextResponse.json({
    profile: {
      id: auth.student.id,
      name: auth.student.name,
      email: auth.student.email,
      studentCode: auth.student.studentCode,
    },
  });
});

export const PATCH = handleApi(async (req) => {
  const auth = await requireStudent();
  const body = (await readBody(req)) as { name?: string; email?: string; phone?: string };
  if (!body || typeof body !== 'object') throw badRequest('Invalid body.');
  // Only permitted fields can be changed — never studentCode/role/permissions (spec §28).
  const profile = await updateProfile(auth, { name: body.name, email: body.email, phone: body.phone });
  return NextResponse.json({ profile });
});

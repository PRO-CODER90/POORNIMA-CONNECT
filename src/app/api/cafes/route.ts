import { NextResponse } from 'next/server';
import { requireStudent } from '@/cafe/lib/rbac';
import { handleApi } from '@/cafe/lib/api';
import { listCafesForStudent } from '@/cafe/server/student';

export const GET = handleApi(async () => {
  const { student } = await requireStudent();
  void student;
  return NextResponse.json({ cafes: await listCafesForStudent() });
});

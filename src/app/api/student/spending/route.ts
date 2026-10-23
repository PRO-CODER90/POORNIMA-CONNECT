import { NextResponse } from 'next/server';
import { requireStudent } from '@/cafe/lib/rbac';
import { handleApi } from '@/cafe/lib/api';
import { studentSpending } from '@/cafe/server/student';

export const GET = handleApi(async () => {
  const auth = await requireStudent();
  return NextResponse.json(await studentSpending(auth));
});

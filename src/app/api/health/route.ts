import { NextResponse } from 'next/server';
import { prisma } from '@/cafe/lib/db';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, service: 'pu-cafeconnect', time: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false, error: 'database unavailable' }, { status: 503 });
  }
}

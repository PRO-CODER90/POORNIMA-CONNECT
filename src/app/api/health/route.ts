import { NextResponse } from 'next/server';
import { prisma } from '@/cafe/lib/db';

// Public: says only whether the service is up. No versions, hostnames or database details.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}

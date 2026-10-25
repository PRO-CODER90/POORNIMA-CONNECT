import { requireAdminPage } from '@/cafe/lib/rbac';
import { prisma } from '@/cafe/lib/db';
import { badRequest } from '@/cafe/lib/api';
import { listInventory } from '@/cafe/server/inventory';
import AdminInventory from '@/cafe/components/admin/AdminInventory';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Admin · Menu' };

export const dynamic = 'force-dynamic';

export default async function AdminMenuPage({ searchParams }: { searchParams: Promise<{ cafe?: string }> }) {
  await requireAdminPage();
  const { cafe: cafeParam } = await searchParams;
  const cafes = await prisma.cafe.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, name: true } });
  if (cafes.length === 0) throw badRequest('No cafes configured yet.');
  const target = cafes.find((c) => c.id === cafeParam || c.code === cafeParam) ?? cafes[0];
  return <AdminInventory cafes={cafes} cafeId={target.id} initial={await listInventory(target.id)} />;
}

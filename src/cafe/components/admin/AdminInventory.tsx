'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import InventoryManager from '@/cafe/components/inventory/InventoryManager';
import { adminInventoryApi, type InventoryData } from '@/cafe/components/inventory/api';

/** Admin gets the same inventory screen as staff, plus a cafe switcher. */
export default function AdminInventory({ cafes, cafeId, initial }: { cafes: { id: string; name: string }[]; cafeId: string; initial: InventoryData }) {
  const router = useRouter();
  const api = useMemo(() => adminInventoryApi(cafeId), [cafeId]);
  const cafe = cafes.find((c) => c.id === cafeId);
  return (
    <div className="space-y-4">
      <select className="input-pu max-w-xs" value={cafeId} onChange={(e) => router.push(`/admin/menu?cafe=${e.target.value}`)} aria-label="Select cafe">
        {cafes.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <InventoryManager key={cafeId} api={api} cafeName={cafe?.name ?? ''} initial={initial} />
    </div>
  );
}

'use client';

import InventoryManager from '@/cafe/components/inventory/InventoryManager';
import { staffInventoryApi } from '@/cafe/components/inventory/api';
import type { InventoryData } from '@/cafe/components/inventory/api';

export default function StaffInventory({ cafeName, initial }: { cafeName: string; initial: InventoryData }) {
  return <InventoryManager api={staffInventoryApi} cafeName={cafeName} initial={initial} />;
}

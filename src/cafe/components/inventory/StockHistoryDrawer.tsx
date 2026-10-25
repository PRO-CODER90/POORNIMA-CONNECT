'use client';

import { useEffect, useState } from 'react';
import { Modal, Skeleton, ErrorNote, EmptyState } from '@/cafe/components/ui';
import { History } from 'lucide-react';
import { fmtDateTime } from '@/cafe/lib/dates';
import { call, type InventoryApi, type InventoryItem } from './api';

interface Movement {
  id: string;
  at: string;
  delta: number;
  qtyAfter: number;
  reason: string;
  note: string;
  orderNumber: string | null;
  by: string | null;
}

const REASON_LABEL: Record<string, string> = {
  INITIAL: 'Opening stock',
  SALE: 'Sale',
  CANCEL_RESTOCK: 'Order cancelled',
  RESTOCK: 'Restock',
  ADJUST: 'Adjustment',
  WASTAGE: 'Damaged',
  EXPIRED: 'Expired',
};

export default function StockHistoryDrawer({ item, api, onClose }: { item: InventoryItem | null; api: InventoryApi; onClose: () => void }) {
  const [rows, setRows] = useState<Movement[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clear the previous item's history while loading
    setRows(null);
    setError(null);
    call<{ movements: Movement[] }>(api.movements(item.id)).then((r) => {
      if (!alive) return;
      if (r.ok) setRows(r.data.movements);
      else setError(r.error);
    });
    return () => {
      alive = false;
    };
  }, [item, api]);

  if (!item) return null;
  return (
    <Modal open onClose={onClose} title={`Stock history · ${item.name}`}>
      {error ? (
        <ErrorNote message={error} />
      ) : rows === null ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<History size={22} />} title="No stock changes yet" />
      ) : (
        <ol className="divide-y divide-slate-100">
          {rows.map((m) => (
            <li key={m.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <div className="font-semibold text-slate-800">
                  {REASON_LABEL[m.reason] ?? m.reason}
                  {m.orderNumber ? <span className="ml-1.5 font-mono text-xs text-slate-500">{m.orderNumber}</span> : null}
                </div>
                <div className="text-[11px] text-slate-500">
                  {fmtDateTime(m.at)}
                  {m.by ? ` · ${m.by}` : ''}
                </div>
                {m.note ? <div className="mt-0.5 text-xs text-slate-600">{m.note}</div> : null}
              </div>
              <div className="shrink-0 text-right">
                <div className={`font-mono font-bold ${m.delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {m.delta >= 0 ? `+${m.delta}` : `−${Math.abs(m.delta)}`}
                </div>
                <div className="text-[11px] text-slate-500">left {m.qtyAfter}</div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}

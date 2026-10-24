'use client';

import { useMemo, useState } from 'react';
import { fmtDateTime } from '@/cafe/lib/dates';
import { Badge, EmptyState } from '@/cafe/components/ui';

export interface AuditRow {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: string | null;
  userEmail: string;
  userRole: string;
  createdAt: string;
}

const ROLE_TONE: Record<string, 'green' | 'indigo' | 'blue' | 'gray'> = {
  ADMIN: 'green',
  CAFE_STAFF: 'indigo',
  STUDENT: 'blue',
  SYSTEM: 'gray',
};

export default function AuditFilter({ initial }: { initial: AuditRow[] }) {
  const [q, setQ] = useState('');
  const [action, setAction] = useState('');

  const actions = useMemo(() => [...new Set(initial.map((r) => r.action))].sort(), [initial]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return initial.filter((r) => {
      if (action && r.action !== action) return false;
      if (s && !r.userEmail.toLowerCase().includes(s) && !(r.metadata ?? '').toLowerCase().includes(s) && !(r.entityType ?? '').toLowerCase().includes(s)) return false;
      return true;
    });
  }, [q, action, initial]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input className="input max-w-xs" placeholder="Search user, entity, metadata…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search audit logs" />
        <select className="input max-w-56" value={action} onChange={(e) => setAction(e.target.value)} aria-label="Filter by action">
          <option value="">All actions</option>
          {actions.map((a) => (<option key={a} value={a}>{a}</option>))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState emoji="📜" title="No audit events match" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 150).map((r) => (
                <tr key={r.id} className="border-b border-slate-50 align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-500">{fmtDateTime(r.createdAt)}</td>
                  <td className="px-4 py-2.5"><Badge tone="gray">{r.action}</Badge></td>
                  <td className="px-4 py-2.5">
                    <div className="text-xs font-bold text-slate-700">{r.userEmail}</div>
                    <Badge tone={ROLE_TONE[r.userRole] ?? 'gray'}>{r.userRole}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{r.entityType ?? '—'}</td>
                  <td className="max-w-[280px] truncate px-4 py-2.5 font-mono text-[11px] text-slate-400" title={r.metadata ?? undefined}>{r.metadata ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

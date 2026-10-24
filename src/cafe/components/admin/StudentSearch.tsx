'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { inr } from '@/cafe/lib/money';
import { fmtDateTime } from '@/cafe/lib/dates';
import { Badge, EmptyState } from '@/cafe/components/ui';

export interface StudentRow {
  id: string;
  studentCode: string;
  name: string;
  email: string;
  course: string;
  department: string;
  year: number;
  phone: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  lastLogin: string | null;
  totalOrders: number;
  totalSpending: number;
  lastOrderAt: string | null;
}

export default function StudentSearch({ initial }: { initial: StudentRow[] }) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return initial;
    return initial.filter(
      (x) => x.studentCode.toLowerCase().includes(s) || x.name.toLowerCase().includes(s) || x.email.toLowerCase().includes(s),
    );
  }, [q, initial]);

  return (
    <div>
      <input className="input mb-4 max-w-md" placeholder="Search Student ID, name or email…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search students" />

      {filtered.length === 0 ? (
        <EmptyState emoji="🎓" title="No students match your search" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Student ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Dept</th>
                <th className="px-4 py-3 text-right">Total Orders</th>
                <th className="px-4 py-3 text-right">Total Spending</th>
                <th className="px-4 py-3">Last Order</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-pu-50/60">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800">{s.studentCode}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-800">{s.name}</div>
                    <div className="text-[11px] text-slate-400">{s.email}</div>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-500">{s.course}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{s.department}</td>
                  <td className="px-4 py-3 text-right font-bold">{s.totalOrders}</td>
                  <td className="px-4 py-3 text-right font-black">{inr(s.totalSpending)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{s.lastOrderAt ? fmtDateTime(s.lastOrderAt) : '—'}</td>
                  <td className="px-4 py-3">
                    <Badge tone={s.status === 'ACTIVE' ? 'green' : 'red'}>{s.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/students/${s.id}`} className="text-xs font-bold text-indigo-600 hover:underline">Open →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import Link from 'next/link';
import { requireAdminPage } from '@/cafe/lib/rbac';
import { adminCafes } from '@/cafe/server/admin/dashboard';
import { OpenBadge } from '@/cafe/components/status';
import { inr } from '@/cafe/lib/money';
import { fmtTime12 } from '@/cafe/utils/format';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Admin · Cafes' };

export const dynamic = 'force-dynamic';

export default async function AdminCafesPage() {
  const admin = await requireAdminPage();
  const cafes = await adminCafes(admin);

  return (
    <div>
      <h1 className="text-xl font-black text-slate-900 sm:text-2xl">All Cafes</h1>
      <p className="mb-5 mt-1 text-sm text-slate-500">Side-by-side comparison of all three campus cafes.</p>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Cafe</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Timings</th>
              <th className="px-4 py-3 text-right">Orders Today</th>
              <th className="px-4 py-3 text-right">Revenue Today</th>
              <th className="px-4 py-3 text-right">Items Sold Today</th>
              <th className="px-4 py-3 text-right">Pending Cash</th>
              <th className="px-4 py-3 text-right">All-Time Revenue</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {cafes.map((c) => (
              <tr key={c.id} className="border-b border-slate-50 hover:bg-pu-50/60">
                <td className="px-4 py-3">
                  <Link href={`/admin/cafes/${c.id}`} className="flex items-center gap-2 font-extrabold text-slate-900 hover:underline">
                    <span className="text-lg" aria-hidden>{c.coverEmoji}</span> {c.name}
                  </Link>
                  <div className="mt-0.5 text-[11px] text-slate-400">{c.location}</div>
                </td>
                <td className="px-4 py-3"><OpenBadge status={c.status} /></td>
                <td className="px-4 py-3 text-xs font-semibold text-slate-500">{fmtTime12(c.openingTime)}–{fmtTime12(c.closingTime)}</td>
                <td className="px-4 py-3 text-right font-bold">{c.today.orders}</td>
                <td className="px-4 py-3 text-right font-bold">{inr(c.today.revenue)}</td>
                <td className="px-4 py-3 text-right font-semibold">{c.today.items}</td>
                <td className={`px-4 py-3 text-right font-bold ${c.today.pending > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{inr(c.today.pending)}</td>
                <td className="px-4 py-3 text-right font-bold">{inr(c.allTime.revenue)}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/cafes/${c.id}`} className="text-xs font-bold text-indigo-600 hover:underline">Open →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

'use client';

import { BarTrend, Donut } from '@/cafe/components/charts';
import { fmtDate } from '@/cafe/lib/dates';

export default function AdminCafeCharts({
  daily,
  monthly,
  categorySales,
}: {
  daily: { date: string; value: number }[];
  monthly: { month: string; value: number }[];
  categorySales: { name: string; total: number; quantity: number }[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card p-5">
        <h3 className="mb-3 text-sm font-extrabold text-slate-900">Daily sales (14 days)</h3>
        <BarTrend data={daily.map((x) => ({ label: fmtDate(x.date), value: x.value }))} color="#6366f1" />
      </div>
      <div className="card p-5">
        <h3 className="mb-3 text-sm font-extrabold text-slate-900">Monthly sales (6 months)</h3>
        <BarTrend data={monthly.map((x) => ({ label: x.month, value: x.value }))} color="#2f63e8" />
      </div>
      <div className="card p-5 lg:col-span-2">
        <h3 className="mb-3 text-sm font-extrabold text-slate-900">Category sales</h3>
        <Donut data={categorySales.map((c) => ({ name: c.name, value: c.total }))} />
      </div>
    </div>
  );
}

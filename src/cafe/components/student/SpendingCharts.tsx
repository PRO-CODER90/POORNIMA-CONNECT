'use client';

import { AreaTrend, BarTrend, Donut } from '@/cafe/components/charts';

interface Point {
  label: string;
  value: number;
}
interface Named {
  name: string;
  value: number;
}

export default function SpendingCharts({
  daily,
  monthly,
  byCategory,
  byCafe,
}: {
  daily: Point[];
  monthly: Point[];
  byCategory: Named[];
  byCafe: Named[];
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] sm:p-6">
        <h3 className="mb-3 text-sm font-bold text-navy">Daily Spending (Last 7 Days)</h3>
        <AreaTrend data={daily} color="#C18A42" />
      </div>
      <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] sm:p-6">
        <h3 className="mb-3 text-sm font-bold text-navy">Monthly Spending</h3>
        <BarTrend data={monthly} color="#17243A" />
      </div>
      <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] sm:p-6">
        <h3 className="mb-3 text-sm font-bold text-navy">Category-wise Spending</h3>
        <Donut data={byCategory} />
      </div>
      <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] sm:p-6">
        <h3 className="mb-3 text-sm font-bold text-navy">Cafe-wise Spending</h3>
        <Donut data={byCafe} />
      </div>
    </div>
  );
}

'use client';

import { AreaTrend, BarTrend, Donut } from '@/cafe/components/charts';

interface Point { label: string; value: number }

export default function AnalyticsCharts({
  byDay,
  byWeek,
  byMonth,
  byCafe,
  byCategory,
}: {
  byDay: Point[];
  byWeek: Point[];
  byMonth: Point[];
  byCafe: Point[];
  byCategory: { name: string; value: number }[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card p-5 lg:col-span-2">
        <h3 className="mb-3 text-sm font-extrabold text-slate-900">Revenue by day (30 days)</h3>
        <AreaTrend data={byDay} color="#6366f1" height={260} />
      </div>
      <div className="card p-5">
        <h3 className="mb-3 text-sm font-extrabold text-slate-900">Revenue by week (8 weeks)</h3>
        <BarTrend data={byWeek} color="#0ea5e9" />
      </div>
      <div className="card p-5">
        <h3 className="mb-3 text-sm font-extrabold text-slate-900">Revenue by month</h3>
        <BarTrend data={byMonth} color="#8b5cf6" />
      </div>
      <div className="card p-5">
        <h3 className="mb-3 text-sm font-extrabold text-slate-900">Revenue by cafe</h3>
        <BarTrend data={byCafe} color="#f97316" />
      </div>
      <div className="card p-5">
        <h3 className="mb-3 text-sm font-extrabold text-slate-900">Revenue by category</h3>
        <Donut data={byCategory} />
      </div>
    </div>
  );
}

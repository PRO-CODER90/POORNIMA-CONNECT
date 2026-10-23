'use client';

import { AreaTrend } from '@/cafe/components/charts';

export default function AdminDashboardCharts({ revenueLast7 }: { revenueLast7: { date: string; value: number }[] }) {
  return (
    <div className="card p-5">
      <h3 className="mb-3 text-sm font-extrabold text-slate-900">University revenue — last 7 days</h3>
      <AreaTrend data={revenueLast7.map((x) => ({ label: x.date.slice(5), value: x.value }))} color="#6366f1" />
    </div>
  );
}

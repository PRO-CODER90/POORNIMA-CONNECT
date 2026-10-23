'use client';

import { Donut } from '@/cafe/components/charts';

export default function AdminStudentCharts({
  byCafe,
  byCategory,
}: {
  byCafe: { name: string; total: number; orders: number }[];
  byCategory: { name: string; total: number; quantity: number }[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="card p-5">
        <h3 className="mb-3 text-sm font-extrabold text-slate-900">Spending by cafe</h3>
        <Donut data={byCafe.map((c) => ({ name: c.name, value: c.total }))} />
      </div>
      <div className="card p-5">
        <h3 className="mb-3 text-sm font-extrabold text-slate-900">Spending by category</h3>
        <Donut data={byCategory.map((c) => ({ name: c.name, value: c.total }))} />
      </div>
    </div>
  );
}

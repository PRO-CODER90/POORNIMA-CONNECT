'use client';

import { AreaTrend, BarTrend, Donut } from '@/cafe/components/charts';

// primary, secondary, tertiary, quaternary (matches the stat-card tints)
const PALETTE = ['#2f63e8', '#e0457b', '#f08a1c', '#1f9d62'];

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
      <div className="surface p-5">
        <h3 className="mb-3 text-base font-bold text-ink">Daily Spending (Last 7 Days)</h3>
        <AreaTrend data={daily} color={PALETTE[0]} />
      </div>
      <div className="surface p-5">
        <h3 className="mb-3 text-base font-bold text-ink">Monthly Spending</h3>
        <BarTrend data={monthly} color={PALETTE[3]} />
      </div>
      <div className="surface p-5">
        <h3 className="mb-3 text-base font-bold text-ink">Category-wise Spending</h3>
        <Donut data={byCategory} palette={PALETTE} />
      </div>
      <div className="surface p-5">
        <h3 className="mb-3 text-base font-bold text-ink">Cafe-wise Spending</h3>
        <Donut data={byCafe} palette={PALETTE} />
      </div>
    </div>
  );
}

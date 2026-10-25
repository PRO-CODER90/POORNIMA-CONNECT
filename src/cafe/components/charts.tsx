'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { inr } from '@/cafe/lib/money';

const TOOLTIP = { borderRadius: 12, border: 'none', fontSize: 12, boxShadow: '0 6px 24px -12px rgba(31,79,209,.18)' };
const PALETTE = ['#2f63e8', '#e0457b', '#f08a1c', '#1f9d62', '#8b5cf6', '#0ea5e9', '#64748b'];

export function AreaTrend({ data, color = '#2f63e8', height = 220 }: { data: { label: string; value: number }[]; color?: string; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={54} tickFormatter={(v: number) => inr(v)} />
          <Tooltip formatter={(v) => [inr(Number(v)), 'Amount']} labelStyle={{ fontSize: 12 }} contentStyle={TOOLTIP} />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} fill={`url(#grad-${color.slice(1)})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarTrend({ data, color = '#2f63e8', height = 220 }: { data: { label: string; value: number }[]; color?: string; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={54} tickFormatter={(v: number) => inr(v)} />
          <Tooltip formatter={(v) => [inr(Number(v)), 'Amount']} labelStyle={{ fontSize: 12 }} contentStyle={TOOLTIP} cursor={{ fill: '#f8fafc' }} />
          <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} maxBarSize={42} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Donut({
  data,
  height = 240,
  money = true,
  palette = PALETTE,
}: {
  data: { name: string; value: number }[];
  height?: number;
  money?: boolean;
  palette?: string[];
}) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center text-xs text-slate-400" style={{ height }}>No data yet</div>;
  }
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2} strokeWidth={0}>
            {data.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => (money ? inr(Number(v)) : String(v))} contentStyle={TOOLTIP} />
          <Legend wrapperStyle={{ fontSize: 11 }} iconSize={9} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

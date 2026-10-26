'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { inr } from '@/cafe/lib/money';
import { fmtDateTime } from '@/cafe/lib/dates';
import { OrderStatusBadge, PaymentBadge } from '@/cafe/components/status';
import { EmptyState, ErrorNote, Skeleton } from '@/cafe/components/ui';

interface DailyTxn {
  orderNumber: string;
  cafe: { name: string };
  student: { name: string; studentCode: string } | null;
  items: { name: string; quantity: number }[];
  totalAmount: number;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod?: string;
  createdAt: string;
}

interface DailyReport {
  date: string;
  summary: { totalOrders: number; validOrders: number; revenue: number; cashReceived: number; pendingCash: number; cancelledOrders: number; studentsServed: number; itemsSold: number };
  transactions: DailyTxn[];
}

function todayKey() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}
function thisMonthKey() {
  return todayKey().slice(0, 7);
}

export default function ReportsPanel() {
  const [date, setDate] = useState(todayKey());
  const [month, setMonth] = useState(thisMonthKey());
  const [type, setType] = useState<'daily' | 'monthly'>('daily');
  const [report, setReport] = useState<DailyReport | null>(null);
  const [monthlyCafes, setMonthlyCafes] = useState<{ name: string; code: string; orders: number; revenue: number; cash: number; pending: number; items: number }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    setReport(null);
    setMonthlyCafes(null);
    try {
      const url = type === 'daily' ? `/api/admin/reports?type=daily&date=${date}` : `/api/admin/reports?type=monthly&month=${month}`;
      const r = await fetch(url);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Failed to load report');
      if (type === 'daily') setReport(d);
      else setMonthlyCafes(d.byCafe);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const exportUrl = (t: string, extra = '') => `/api/admin/export?type=${t}${extra}`;

  return (
    <div className="space-y-5">
      <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label" htmlFor="rp-date">Report date</label>
          <input id="rp-date" type="date" className="input" value={date} onChange={(e) => { setDate(e.target.value); setType('daily'); }} />
        </div>
        <div>
          <label className="label" htmlFor="rp-month">Report month</label>
          <input id="rp-month" type="month" className="input" value={month} onChange={(e) => { setMonth(e.target.value); setType('monthly'); }} />
        </div>
        <div className="flex items-end">
          <button onClick={load} className="btn-primary w-full" disabled={loading}>{loading ? 'Loading…' : 'Generate report'}</button>
        </div>
        <div className="flex items-end">
          <div className="flex w-full flex-wrap gap-2">
            <a href={exportUrl('daily', `&date=${date}`)} className="btn-secondary !px-3 !py-2 text-xs"><Download size={13} aria-hidden /> Daily CSV</a>
            <a href={exportUrl('monthly', `&month=${month}`)} className="btn-secondary !px-3 !py-2 text-xs"><Download size={13} aria-hidden /> Monthly CSV</a>
            <a href={exportUrl('cafe')} className="btn-secondary !px-3 !py-2 text-xs"><Download size={13} aria-hidden /> Cafe CSV</a>
            <a href={exportUrl('students')} className="btn-secondary !px-3 !py-2 text-xs"><Download size={13} aria-hidden /> Students CSV</a>
            <a href={exportUrl('sales')} className="btn-secondary !px-3 !py-2 text-xs"><Download size={13} aria-hidden /> Sales CSV</a>
          </div>
        </div>
      </div>

      {error && <ErrorNote message={error} />}
      {loading && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
          <Skeleton className="h-64" />
        </div>
      )}

      {!loading && report && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="Total Orders" value={String(report.summary.totalOrders)} />
            <Metric label="Revenue (valid)" value={inr(report.summary.revenue)} />
            <Metric label="Cash Received" value={inr(report.summary.cashReceived)} tone="text-emerald-600" />
            <Metric label="Pending Cash" value={inr(report.summary.pendingCash)} tone={report.summary.pendingCash > 0 ? 'text-rose-600' : ''} />
            <Metric label="Cancelled" value={String(report.summary.cancelledOrders)} />
            <Metric label="Students Served" value={String(report.summary.studentsServed)} />
            <Metric label="Items Sold" value={String(report.summary.itemsSold)} />
            <Metric label="Valid Orders" value={String(report.summary.validOrders)} />
          </div>

          <div className="card overflow-x-auto">
            <h3 className="px-4 pt-4 text-sm font-extrabold text-slate-900">Transactions — {report.date}</h3>
            {report.transactions.length === 0 ? (
              <div className="p-4"><EmptyState emoji="🧾" title="No sales recorded for this date" /></div>
            ) : (
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2.5">Order</th>
                    <th className="px-4 py-2.5">Time</th>
                    <th className="px-4 py-2.5">Cafe</th>
                    <th className="px-4 py-2.5">Student</th>
                    <th className="px-4 py-2.5">Items</th>
                    <th className="px-4 py-2.5 text-right">Amount</th>
                    <th className="px-4 py-2.5">Payment</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.transactions.map((t) => (
                    <tr key={t.orderNumber} className="border-b border-slate-50">
                      <td className="px-4 py-2.5 font-mono text-xs font-bold">{t.orderNumber}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{fmtDateTime(t.createdAt)}</td>
                      <td className="px-4 py-2.5 text-xs font-semibold">{t.cafe.name}</td>
                      <td className="px-4 py-2.5 text-xs">{t.student?.name} <span className="font-mono text-[10px] text-slate-400">{t.student?.studentCode}</span></td>
                      <td className="max-w-[200px] truncate px-4 py-2.5 text-xs text-slate-500">{t.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}</td>
                      <td className="px-4 py-2.5 text-right font-black">{inr(t.totalAmount)}</td>
                      <td className="px-4 py-2.5"><PaymentBadge status={t.paymentStatus} method={t.paymentMethod} /></td>
                      <td className="px-4 py-2.5"><OrderStatusBadge status={t.orderStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {!loading && monthlyCafes && (
        <div className="card overflow-x-auto">
          <h3 className="px-4 pt-4 text-sm font-extrabold text-slate-900">Monthly report — {month}</h3>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">Cafe</th>
                <th className="px-4 py-2.5 text-right">Orders</th>
                <th className="px-4 py-2.5 text-right">Revenue</th>
                <th className="px-4 py-2.5 text-right">Cash Received</th>
                <th className="px-4 py-2.5 text-right">Pending</th>
                <th className="px-4 py-2.5 text-right">Items</th>
              </tr>
            </thead>
            <tbody>
              {monthlyCafes.map((c) => (
                <tr key={c.code} className="border-b border-slate-50">
                  <td className="px-4 py-2.5 font-bold">{c.name}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">{c.orders}</td>
                  <td className="px-4 py-2.5 text-right font-black">{inr(c.revenue)}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-emerald-600">{inr(c.cash)}</td>
                  <td className={`px-4 py-2.5 text-right font-bold ${c.pending > 0 ? 'text-rose-600' : ''}`}>{inr(c.pending)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">{c.items}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-0.5 text-lg font-black ${tone || 'text-slate-900'}`}>{value}</div>
    </div>
  );
}

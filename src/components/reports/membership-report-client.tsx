'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MembershipReportRow } from '@/app/actions/membership-report';
import { formatLKR } from '@/lib/utils';

interface Agg {
  key: string;
  label: string;
  count: number;
  active: number;
  cancelled: number;
  expired: number;
  gross: number;
  trainer: number;
  discounts: number;
  due: number;
  paid: number;
  refunds: number;
}

const empty = (key: string, label: string): Agg => ({
  key, label, count: 0, active: 0, cancelled: 0, expired: 0,
  gross: 0, trainer: 0, discounts: 0, due: 0, paid: 0, refunds: 0,
});

function add(a: Agg, r: MembershipReportRow) {
  a.count += r.memberships;
  a[r.status] += r.memberships;
  a.gross += r.plan_value;
  a.trainer += r.trainer_fees;
  a.discounts += r.discounts;
  a.due += r.total_due;
  a.paid += r.total_paid;
  a.refunds += r.refunds;
}

const monthName = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`)
  );

type View = 'category' | 'plan' | 'month';

export function MembershipReportClient({ rows, from, to }: { rows: MembershipReportRow[]; from: string; to: string }) {
  const router = useRouter();
  const [view, setView] = useState<View>('category');
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);

  const totals = useMemo(() => {
    const a = empty('all', 'Total');
    rows.forEach((r) => add(a, r));
    return a;
  }, [rows]);

  const groups = useMemo(() => {
    const map = new Map<string, Agg>();
    for (const r of rows) {
      const [key, label] =
        view === 'category'
          ? [r.target_group, r.target_group]
          : view === 'plan'
            ? [r.plan_id, r.plan_name]
            : [r.month_start, monthName(r.month_start)];
      if (!map.has(key)) map.set(key, empty(key, label));
      add(map.get(key)!, r);
    }
    const list = [...map.values()];
    return view === 'month' ? list.sort((a, b) => b.key.localeCompare(a.key)) : list.sort((a, b) => b.due - a.due);
  }, [rows, view]);

  const maxDue = Math.max(...groups.map((g) => g.due), 1);

  function apply() {
    const q = new URLSearchParams();
    if (f) q.set('from', f);
    if (t) q.set('to', t);
    router.push(`/reports/memberships${q.size ? `?${q}` : ''}`);
  }

  function exportCSV() {
    const head = ['Group', 'Memberships', 'Active', 'Expired', 'Cancelled', 'Plan value', 'Trainer fees', 'Discounts', 'Total due', 'Collected', 'Outstanding', 'Refunds'];
    const body = [...groups, totals].map((g) =>
      [g.label, g.count, g.active, g.expired, g.cancelled, g.gross, g.trainer, g.discounts, g.due, g.paid, g.due - g.paid, g.refunds]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const blob = new Blob([[head.join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `membership_report_${view}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const input = 'min-h-11 rounded-xl border border-[#27272A] bg-[#09090B] px-3 text-sm text-[#F4F4F5] [color-scheme:dark]';
  const tab = (v: View, label: string) => (
    <button
      key={v}
      type="button"
      onClick={() => setView(v)}
      aria-pressed={view === v}
      className={`min-h-11 rounded-xl px-4 text-sm font-medium transition-colors ${view === v ? 'bg-[#E5B842]/15 text-[#F5D061]' : 'text-[#A1A1AA] hover:text-[#F4F4F5]'}`}
    >
      {label}
    </button>
  );

  const stat = (label: string, value: string) => (
    <div className="card-luxury rounded-2xl border border-[#27272A] bg-[#121214] p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA]">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-[#F5D061]">{value}</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[11px] text-[#A1A1AA]">From
            <input type="month" value={f} onChange={(e) => setF(e.target.value)} className={`${input} mt-1 block`} />
          </label>
          <label className="text-[11px] text-[#A1A1AA]">To
            <input type="month" value={t} onChange={(e) => setT(e.target.value)} className={`${input} mt-1 block`} />
          </label>
          <button type="button" onClick={apply} className="min-h-11 rounded-xl bg-[#E5B842] px-4 text-sm font-semibold text-[#09090B] hover:bg-[#F5D061]">Apply</button>
        </div>
        <button type="button" onClick={exportCSV} disabled={rows.length === 0} className="min-h-11 rounded-xl border border-[#27272A] px-4 text-sm text-[#D4D4D8] hover:border-[#3F3F46] disabled:opacity-50">Export CSV</button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stat('Memberships', String(totals.count))}
        {stat('Total due', formatLKR(totals.due))}
        {stat('Collected', formatLKR(totals.paid))}
        {stat('Outstanding', formatLKR(totals.due - totals.paid))}
      </div>

      <div role="group" aria-label="Group by" className="flex gap-1">
        {tab('category', 'By category')}
        {tab('plan', 'By plan')}
        {tab('month', 'By month')}
      </div>

      <div className="card-luxury overflow-x-auto rounded-2xl border border-[#27272A] bg-[#121214]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#27272A] text-[11px] uppercase tracking-wider text-[#A1A1AA]">
              <th className="px-4 py-3">{view === 'category' ? 'Category' : view === 'plan' ? 'Plan' : 'Month'}</th>
              <th className="px-4 py-3 text-right">Count</th>
              <th className="px-4 py-3 text-right">Act / Exp / Can</th>
              <th className="px-4 py-3 text-right">Discounts</th>
              <th className="px-4 py-3 text-right">Trainer fees</th>
              <th className="px-4 py-3 text-right">Total due</th>
              <th className="px-4 py-3 text-right">Collected</th>
              <th className="px-4 py-3 text-right">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-[#A1A1AA]">No memberships in this range.</td></tr>
            ) : (
              groups.map((g) => (
                <tr key={g.key} className="border-b border-[#27272A]/60">
                  <td className="px-4 py-3">
                    <p className="font-medium capitalize text-[#F4F4F5]">{g.label}</p>
                    <div className="mt-1.5 h-1 w-full max-w-40 rounded-full bg-[#27272A]">
                      <div className="h-1 rounded-full bg-[#E5B842]" style={{ width: `${(g.due / maxDue) * 100}%` }} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#D4D4D8]">{g.count}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#A1A1AA]">{g.active} / {g.expired} / {g.cancelled}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#A1A1AA]">{formatLKR(g.discounts)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#A1A1AA]">{formatLKR(g.trainer)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#F5D061]">{formatLKR(g.due)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#10B981]">{formatLKR(g.paid)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#F59E0B]">{formatLKR(g.due - g.paid)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

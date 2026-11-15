'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { TrainerCommissionSummary } from '@/app/actions/trainer-commissions';
import { formatLKR } from '@/lib/utils';
import { DateRangeFilter } from '@/components/trainers/date-range-filter';

type SortKey = 'members' | 'commission' | 'revenue' | 'balance';

const stat = (label: string, value: string, hint?: string) => (
  <div className="card-luxury rounded-2xl border border-[#27272A] bg-[#121214] p-4">
    <p className="text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA]">{label}</p>
    <p className="mt-1 text-lg font-bold tabular-nums text-[#F5D061]">{value}</p>
    {hint && <p className="mt-0.5 text-[10px] text-[#71717A]">{hint}</p>}
  </div>
);

export function TrainerReportClient({
  rows,
  from,
  to,
}: {
  rows: TrainerCommissionSummary[];
  from: string;
  to: string;
}) {
  const [sort, setSort] = useState<SortKey>('commission');

  const sorted = useMemo(() => {
    const key: Record<SortKey, (r: TrainerCommissionSummary) => number> = {
      members: (r) => r.members,
      commission: (r) => r.commission_earned,
      revenue: (r) => r.pt_net,
      balance: (r) => r.balance,
    };
    return [...rows].sort((a, b) => key[sort](b) - key[sort](a) || a.name.localeCompare(b.name));
  }, [rows, sort]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (a, r) => ({
          memberships: a.memberships + r.memberships,
          members: a.members + r.members,
          net: a.net + r.pt_net,
          earned: a.earned + r.commission_earned,
          pending: a.pending + r.commission_pending,
          balance: a.balance + r.balance,
        }),
        { memberships: 0, members: 0, net: 0, earned: 0, pending: 0, balance: 0 }
      ),
    [rows]
  );

  function exportCSV() {
    const head = [
      'Trainer', 'Status', 'Rate %', 'Memberships', 'Active', 'Cancelled', 'Members',
      'PT fees (gross)', 'PT fees (net of discount)', 'PT fees collected',
      'Commission earned', 'Commission pending', 'Paid out (period)', 'Earned (all time)',
      'Paid out (all time)', 'Balance owed',
    ];
    const body = sorted.map((r) =>
      [
        r.name, r.is_active ? 'Active' : 'Inactive', r.commission_rate, r.memberships,
        r.active_memberships, r.cancelled_memberships, r.members, r.pt_gross, r.pt_net,
        r.pt_collected, r.commission_earned, r.commission_pending, r.period_paid,
        r.alltime_earned, r.alltime_paid, r.balance,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const blob = new Blob([[head.join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `trainer_commissions_${from || 'start'}_${to || 'today'}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const noRate = rows.filter((r) => r.commission_rate === 0 && r.memberships > 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <DateRangeFilter basePath="/reports/trainers" from={from} to={to} />
        <button
          type="button"
          onClick={exportCSV}
          disabled={rows.length === 0}
          className="min-h-11 rounded-xl border border-[#27272A] px-4 text-sm text-[#D4D4D8] hover:border-[#3F3F46] disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>

      {noRate.length > 0 && (
        <div className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 p-3 text-xs text-[#F59E0B]">
          No commission rate is set for {noRate.map((r) => r.name).join(', ')}. Their memberships earn
          LKR 0 until a rate is configured, and rate changes only apply to memberships created afterwards.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stat('PT memberships', String(totals.memberships), 'In selected period')}
        {stat('Commission earned', formatLKR(totals.earned), 'On collected PT fees')}
        {stat('Pending collection', formatLKR(totals.pending), 'Earns as balances are paid')}
        {stat('Owed to trainers', formatLKR(totals.balance), 'All time, after payouts')}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-[#A1A1AA]">
        <label htmlFor="trainer-sort">Rank by</label>
        <select
          id="trainer-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="min-h-11 rounded-xl border border-[#27272A] bg-[#09090B] px-3 text-sm text-[#F4F4F5]"
        >
          <option value="commission">Commission earned</option>
          <option value="members">Members trained</option>
          <option value="revenue">PT revenue</option>
          <option value="balance">Balance owed</option>
        </select>
      </div>

      <div className="card-luxury overflow-x-auto rounded-2xl border border-[#27272A] bg-[#121214]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#27272A] text-[11px] uppercase tracking-wider text-[#A1A1AA]">
              <th className="px-4 py-3">Trainer</th>
              <th className="px-4 py-3 text-right">Rate</th>
              <th className="px-4 py-3 text-right">Members</th>
              <th className="px-4 py-3 text-right">Memberships</th>
              <th className="px-4 py-3 text-right">PT revenue (net)</th>
              <th className="px-4 py-3 text-right">Collected</th>
              <th className="px-4 py-3 text-right">Commission</th>
              <th className="px-4 py-3 text-right">Paid out</th>
              <th className="px-4 py-3 text-right">Balance owed</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-[#A1A1AA]">
                  No trainers registered yet.
                </td>
              </tr>
            ) : (
              sorted.map((r, i) => (
                <tr key={r.trainer_id} className="border-b border-[#27272A]/60">
                  <td className="px-4 py-3">
                    <Link
                      href={`/trainers/${r.trainer_id}`}
                      className="font-medium text-[#F4F4F5] hover:text-[#F5D061]"
                    >
                      <span className="mr-2 text-[11px] text-[#71717A]">{i + 1}</span>
                      {r.name}
                    </Link>
                    {!r.is_active && (
                      <span className="ml-2 rounded-full border border-[#71717A]/30 px-2 py-0.5 text-[9px] uppercase text-[#A1A1AA]">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-right tabular-nums ${r.commission_rate === 0 ? 'text-[#F59E0B]' : 'text-[#D4D4D8]'}`}>
                    {r.commission_rate}%
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#D4D4D8]">{r.members}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#A1A1AA]">
                    {r.memberships}
                    {r.cancelled_memberships > 0 && (
                      <span className="text-[10px] text-[#EF4444]"> ({r.cancelled_memberships} cancelled)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#A1A1AA]">{formatLKR(r.pt_net)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#10B981]">{formatLKR(r.pt_collected)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#F5D061]">{formatLKR(r.commission_earned)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#A1A1AA]">{formatLKR(r.period_paid)}</td>
                  <td
                    className={`px-4 py-3 text-right font-semibold tabular-nums ${r.balance < 0 ? 'text-[#EF4444]' : 'text-[#F5D061]'}`}
                  >
                    {formatLKR(r.balance)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] leading-relaxed text-[#71717A]">
        The date range filters memberships by start date. “Balance owed” is all-time (earned − paid out) and
        ignores the range. Commission = rate × the PT fee after the trainer’s share of any discount, earned as
        payments are collected and reduced by refunds. A negative balance means a trainer was paid more than
        they currently hold (for example after a refund) and will be offset by future commission.
      </p>
    </div>
  );
}

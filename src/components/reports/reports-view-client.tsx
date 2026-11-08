'use client';

import { useState } from 'react';
import type {
  DailyRevenueReport,
  WeeklyRevenueReport,
  MonthlyRevenueReport,
  MembershipStatusSummary,
  UpcomingExpiry,
  Profile,
} from '@/types/database';
import { formatLKR, formatDate } from '@/lib/utils';
import { RevenueBarChart } from './revenue-bar-chart';
import { StatusDistributionChart } from './status-distribution-chart';
import Link from 'next/link';
import {
  ArrowUpRight,
  Download,
} from 'lucide-react';

interface ReportsViewClientProps {
  daily: DailyRevenueReport[];
  weekly: WeeklyRevenueReport[];
  monthly: MonthlyRevenueReport[];
  statusSummary: MembershipStatusSummary[];
  upcomingExpiries: UpcomingExpiry[];
  currentUserProfile: Profile | null;
}

export function ReportsViewClient({
  daily,
  weekly,
  monthly,
  statusSummary,
  upcomingExpiries,
}: ReportsViewClientProps) {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly' | 'expiries'>('daily');

  // Prepare chart data objects
  const dailyChartData = [...daily].reverse().map((d) => ({
    label: formatDate(d.report_date).split(' ').slice(0, 2).join(' '),
    total: Number(d.total_revenue),
    cash: Number(d.cash_revenue),
    card: Number(d.card_revenue),
    bank: Number(d.bank_revenue),
    count: Number(d.transaction_count),
  }));

  const weeklyChartData = [...weekly].reverse().map((w) => ({
    label: `Wk ${formatDate(w.week_start).split(' ')[0]}`,
    total: Number(w.total_revenue),
    cash: Number(w.cash_revenue),
    card: Number(w.card_revenue),
    bank: Number(w.bank_revenue),
    count: Number(w.transaction_count),
  }));

  const monthlyChartData = [...monthly].reverse().map((m) => ({
    label: formatDate(m.month_start).split(' ').slice(1, 3).join(' '),
    total: Number(m.total_revenue),
    cash: Number(m.cash_revenue),
    card: Number(m.card_revenue),
    bank: Number(m.bank_revenue),
    count: Number(m.transaction_count),
  }));

  // Export CSV helper
  function exportCSV() {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (activeTab === 'daily') {
      headers = ['Date', 'Transactions', 'Cash', 'Card', 'Bank', 'Total Revenue'];
      rows = daily.map((r) => [
        r.report_date,
        String(r.transaction_count),
        String(r.cash_revenue),
        String(r.card_revenue),
        String(r.bank_revenue),
        String(r.total_revenue),
      ]);
    } else if (activeTab === 'weekly') {
      headers = ['Week Starting', 'Transactions', 'Cash', 'Card', 'Bank', 'Total Revenue'];
      rows = weekly.map((r) => [
        r.week_start,
        String(r.transaction_count),
        String(r.cash_revenue),
        String(r.card_revenue),
        String(r.bank_revenue),
        String(r.total_revenue),
      ]);
    } else if (activeTab === 'monthly') {
      headers = ['Month', 'Transactions', 'Cash', 'Card', 'Bank', 'Total Revenue'];
      rows = monthly.map((r) => [
        r.month_start,
        String(r.transaction_count),
        String(r.cash_revenue),
        String(r.card_revenue),
        String(r.bank_revenue),
        String(r.total_revenue),
      ]);
    } else {
      headers = ['Invoice #', 'Member', 'Phone', 'Plan', 'Expiry Date', 'Days Left'];
      rows = upcomingExpiries.map((r) => [
        r.invoice_number,
        r.member_name,
        r.member_phone,
        r.plan_name,
        r.end_date,
        String(r.days_remaining),
      ]);
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `evo_fitness_report_${activeTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      {/* Membership Status Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statusSummary.map((item) => (
          <div
            key={item.status}
            className="card-luxury rounded-2xl p-5 bg-[#121214]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
                {item.status} Memberships
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  item.status === 'active'
                    ? 'bg-[#10B981]/10 text-[#10B981]'
                    : item.status === 'cancelled'
                    ? 'bg-[#EF4444]/10 text-[#EF4444]'
                    : 'bg-[#71717A]/10 text-[#A1A1AA]'
                }`}
              >
                {item.total_memberships} orders
              </span>
            </div>

            <p className="text-xl font-bold text-[#F4F4F5]">
              {formatLKR(Number(item.total_value))}
            </p>

            <div className="mt-3 pt-3 border-t border-[#27272A] flex justify-between text-[11px] text-[#A1A1AA]">
              <span>Paid: <strong className="text-[#10B981]">{formatLKR(Number(item.total_paid))}</strong></span>
              <span>Due: <strong className="text-[#F59E0B]">{formatLKR(Number(item.total_outstanding))}</strong></span>
            </div>
          </div>
        ))}
      </div>

      {/* Visual Status Distribution Bar */}
      <StatusDistributionChart summary={statusSummary} />

      {/* Tabs & Export Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 bg-[#121214] border border-[#27272A] rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'daily'
                ? 'bg-[#E5B842] text-[#09090B]'
                : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
            }`}
          >
            Daily Collections
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'weekly'
                ? 'bg-[#E5B842] text-[#09090B]'
                : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
            }`}
          >
            Weekly Trends
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'monthly'
                ? 'bg-[#E5B842] text-[#09090B]'
                : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
            }`}
          >
            Monthly Trends
          </button>
          <button
            onClick={() => setActiveTab('expiries')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'expiries'
                ? 'bg-[#E5B842] text-[#09090B]'
                : 'text-[#A1A1AA] hover:text-[#F4F4F5]'
            }`}
          >
            Upcoming Expiries ({upcomingExpiries.length})
          </button>
        </div>

        <button
          onClick={exportCSV}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-xs font-medium text-[#F4F4F5] transition-colors cursor-pointer shrink-0"
        >
          <Download className="w-3.5 h-3.5 text-[#E5B842]" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Tab Visual Graphs */}
      {activeTab === 'daily' && dailyChartData.length > 0 && (
        <RevenueBarChart
          title="Daily Collections Trend"
          subtitle="Recent payment collections grouped by Cash, Card, and Bank"
          data={dailyChartData}
        />
      )}

      {activeTab === 'weekly' && weeklyChartData.length > 0 && (
        <RevenueBarChart
          title="Weekly Revenue Performance"
          subtitle="Week-by-week aggregated transaction volumes"
          data={weeklyChartData}
        />
      )}

      {activeTab === 'monthly' && monthlyChartData.length > 0 && (
        <RevenueBarChart
          title="Monthly Collections Trajectory"
          subtitle="Historical monthly comparisons across payment channels"
          data={monthlyChartData}
        />
      )}

      {/* Tab Data Tables */}
      {activeTab === 'daily' && (
        <div className="card-luxury rounded-2xl bg-[#121214] overflow-hidden border border-[#27272A]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#27272A] bg-[#18181B]/70 text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Transactions</th>
                  <th className="py-3 px-4">Cash (LKR)</th>
                  <th className="py-3 px-4">Card (LKR)</th>
                  <th className="py-3 px-4">Bank (LKR)</th>
                  <th className="py-3 px-4 text-right">Total Revenue (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]/60">
                {daily.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#71717A]">
                      No daily revenue recorded.
                    </td>
                  </tr>
                ) : (
                  daily.map((r) => (
                    <tr key={r.report_date} className="hover:bg-[#18181B]/50">
                      <td className="py-3 px-4 font-semibold text-[#F4F4F5]">
                        {formatDate(r.report_date)}
                      </td>
                      <td className="py-3 px-4 text-[#D4D4D8]">
                        {r.transaction_count}
                      </td>
                      <td className="py-3 px-4 text-[#A1A1AA]">
                        {formatLKR(Number(r.cash_revenue))}
                      </td>
                      <td className="py-3 px-4 text-[#A1A1AA]">
                        {formatLKR(Number(r.card_revenue))}
                      </td>
                      <td className="py-3 px-4 text-[#A1A1AA]">
                        {formatLKR(Number(r.bank_revenue))}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#E5B842]">
                        {formatLKR(Number(r.total_revenue))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'weekly' && (
        <div className="card-luxury rounded-2xl bg-[#121214] overflow-hidden border border-[#27272A]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#27272A] bg-[#18181B]/70 text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                  <th className="py-3 px-4">Week Starting</th>
                  <th className="py-3 px-4">Transactions</th>
                  <th className="py-3 px-4">Cash</th>
                  <th className="py-3 px-4">Card</th>
                  <th className="py-3 px-4">Bank</th>
                  <th className="py-3 px-4 text-right">Total (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]/60">
                {weekly.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#71717A]">
                      No weekly data recorded.
                    </td>
                  </tr>
                ) : (
                  weekly.map((r) => (
                    <tr key={r.week_start} className="hover:bg-[#18181B]/50">
                      <td className="py-3 px-4 font-semibold text-[#F4F4F5]">
                        {formatDate(r.week_start)}
                      </td>
                      <td className="py-3 px-4 text-[#D4D4D8]">
                        {r.transaction_count}
                      </td>
                      <td className="py-3 px-4 text-[#A1A1AA]">
                        {formatLKR(Number(r.cash_revenue))}
                      </td>
                      <td className="py-3 px-4 text-[#A1A1AA]">
                        {formatLKR(Number(r.card_revenue))}
                      </td>
                      <td className="py-3 px-4 text-[#A1A1AA]">
                        {formatLKR(Number(r.bank_revenue))}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#E5B842]">
                        {formatLKR(Number(r.total_revenue))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'monthly' && (
        <div className="card-luxury rounded-2xl bg-[#121214] overflow-hidden border border-[#27272A]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#27272A] bg-[#18181B]/70 text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                  <th className="py-3 px-4">Month</th>
                  <th className="py-3 px-4">Transactions</th>
                  <th className="py-3 px-4">Cash</th>
                  <th className="py-3 px-4">Card</th>
                  <th className="py-3 px-4">Bank</th>
                  <th className="py-3 px-4 text-right">Total (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]/60">
                {monthly.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#71717A]">
                      No monthly data recorded.
                    </td>
                  </tr>
                ) : (
                  monthly.map((r) => (
                    <tr key={r.month_start} className="hover:bg-[#18181B]/50">
                      <td className="py-3 px-4 font-semibold text-[#F4F4F5]">
                        {formatDate(r.month_start)}
                      </td>
                      <td className="py-3 px-4 text-[#D4D4D8]">
                        {r.transaction_count}
                      </td>
                      <td className="py-3 px-4 text-[#A1A1AA]">
                        {formatLKR(Number(r.cash_revenue))}
                      </td>
                      <td className="py-3 px-4 text-[#A1A1AA]">
                        {formatLKR(Number(r.card_revenue))}
                      </td>
                      <td className="py-3 px-4 text-[#A1A1AA]">
                        {formatLKR(Number(r.bank_revenue))}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#E5B842]">
                        {formatLKR(Number(r.total_revenue))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'expiries' && (
        <div className="card-luxury rounded-2xl bg-[#121214] overflow-hidden border border-[#27272A]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#27272A] bg-[#18181B]/70 text-[11px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Urgency</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]/60">
                {upcomingExpiries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#71717A]">
                      No memberships approaching expiry in the next 7 days.
                    </td>
                  </tr>
                ) : (
                  upcomingExpiries.map((item) => (
                    <tr key={item.membership_id} className="hover:bg-[#18181B]/50">
                      <td className="py-3 px-4 font-mono font-bold text-[#E5B842]">
                        {item.invoice_number}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#F4F4F5]">
                        {item.member_name}
                      </td>
                      <td className="py-3 px-4 text-[#D4D4D8]">
                        {item.member_phone}
                      </td>
                      <td className="py-3 px-4 text-[#A1A1AA]">
                        {item.plan_name}
                      </td>
                      <td className="py-3 px-4 text-[#F4F4F5]">
                        {formatDate(item.end_date)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 font-bold text-[10px]">
                          {item.days_remaining === 0 ? 'Today' : `${item.days_remaining} days`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/memberships/new?member_id=${item.member_id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#E5B842] hover:underline"
                        >
                          Renew Order
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

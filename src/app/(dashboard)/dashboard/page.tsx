import { getDashboardStats, getDailyRevenue } from '@/app/actions/reports';
import { getPendingRegistrationCount } from '@/app/actions/registrations';
import { getCurrentUserProfile } from '@/app/actions/auth';
import { formatLKR, formatDate } from '@/lib/utils';
import Link from 'next/link';
import {
  Users,
  CreditCard,
  Receipt,
  CalendarClock,
  ArrowUpRight,
  PlusCircle,
  TrendingUp,
  ClipboardList,
} from 'lucide-react';

export default async function DashboardPage() {
  const { profile } = await getCurrentUserProfile();
  const stats = await getDashboardStats();
  const dailyRevenue = await getDailyRevenue();
  const pendingRegistrations = await getPendingRegistrationCount();
  const isAdmin = profile?.role === 'admin';

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#27272A]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#F4F4F5]">
              Operations Dashboard
            </h1>
            {isAdmin ? (
              <span className="px-2 py-0.5 rounded-full bg-[#E5B842]/10 border border-[#E5B842]/30 text-[10px] font-semibold text-[#E5B842]">
                Admin
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-[#27272A] border border-[#3F3F46] text-[10px] text-[#A1A1AA]">
                Shop Staff
              </span>
            )}
          </div>
          <p className="text-xs text-[#A1A1AA] mt-1">
            Balapokuna Road, Colombo 5 &bull; Real-time Gym Management
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/memberships/new"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gold-gradient text-[#09090B] font-semibold text-xs hover:brightness-105 transition-all shadow-[0_2px_12px_rgba(229,184,66,0.2)] cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            New Order
          </Link>
          <Link
            href="/members"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#F4F4F5] text-xs font-medium transition-colors"
          >
            <Users className="w-4 h-4 text-[#A1A1AA]" />
            Register Member
          </Link>
        </div>
      </div>

      {pendingRegistrations > 0 && (
        <Link
          href="/registrations"
          className="card-luxury rounded-2xl bg-[#121214] p-4 flex items-center gap-3.5 border-gold-accent hover:border-[#E5B842]/60 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-[#E5B842]/10 border border-[#E5B842]/30 flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5 text-[#E5B842]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#F4F4F5]">
              {pendingRegistrations} new registration
              {pendingRegistrations === 1 ? '' : 's'} awaiting review
            </p>
            <p className="text-[11px] text-[#A1A1AA] mt-0.5">
              Submitted through the public QR application form
            </p>
          </div>
          <span className="text-xs font-semibold text-[#E5B842] flex items-center gap-1 shrink-0">
            View
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Cash Flow */}
        <div className="card-luxury rounded-2xl p-5 bg-[#121214]">
          <div className="flex items-center justify-between text-[#A1A1AA] mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">
              Today&apos;s Collections
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#E5B842]/10 border border-[#E5B842]/20 flex items-center justify-center text-[#E5B842]">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight text-[#F4F4F5]">
            {formatLKR(stats.todayRevenue)}
          </p>
          <div className="mt-3 pt-3 border-t border-[#27272A] flex items-center justify-between text-[11px] text-[#A1A1AA]">
            <span>Cash: <strong className="text-[#F4F4F5]">{formatLKR(stats.todayCash)}</strong></span>
            <span>Card: <strong className="text-[#F4F4F5]">{formatLKR(stats.todayCard)}</strong></span>
          </div>
        </div>

        {/* Active Memberships */}
        <div className="card-luxury rounded-2xl p-5 bg-[#121214]">
          <div className="flex items-center justify-between text-[#A1A1AA] mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">
              Active Memberships
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center text-[#10B981]">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight text-[#F4F4F5]">
            {stats.activeMemberships}
          </p>
          <div className="mt-3 pt-3 border-t border-[#27272A] flex items-center justify-between text-[11px] text-[#A1A1AA]">
            <span>Total Registered: <strong className="text-[#F4F4F5]">{stats.totalMembers}</strong></span>
            <Link
              href="/memberships"
              className="text-[#E5B842] hover:underline flex items-center gap-0.5"
            >
              View <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Expiring Soon (7 Days) */}
        <div className="card-luxury rounded-2xl p-5 bg-[#121214]">
          <div className="flex items-center justify-between text-[#A1A1AA] mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">
              Expiring in 7 Days
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center text-[#F59E0B]">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight text-[#F59E0B]">
            {stats.upcomingExpiriesCount}
          </p>
          <div className="mt-3 pt-3 border-t border-[#27272A] flex items-center justify-between text-[11px] text-[#A1A1AA]">
            <span>Requires Renewal</span>
            <Link
              href="/reports"
              className="text-[#F59E0B] hover:underline flex items-center gap-0.5"
            >
              Details <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Total Registered Members */}
        <div className="card-luxury rounded-2xl p-5 bg-[#121214]">
          <div className="flex items-center justify-between text-[#A1A1AA] mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">
              Member Base
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight text-[#F4F4F5]">
            {stats.totalMembers}
          </p>
          <div className="mt-3 pt-3 border-t border-[#27272A] flex items-center justify-between text-[11px] text-[#A1A1AA]">
            <span>All Time</span>
            <Link
              href="/members"
              className="text-[#3B82F6] hover:underline flex items-center gap-0.5"
            >
              Directory <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Upcoming Expiries & Recent Collections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Expiries Alert Section */}
        <div className="card-luxury rounded-2xl p-6 bg-[#121214]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#F4F4F5] uppercase tracking-wider flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-[#F59E0B]" />
                Upcoming Expiries (Next 7 Days)
              </h2>
              <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                Members needing renewal contact and reminder notifications
              </p>
            </div>
            <Link
              href="/reports"
              className="text-xs text-[#E5B842] hover:underline flex items-center gap-1 font-medium"
            >
              All Expiries <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {stats.upcomingExpiries.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-[#18181B]/50 border border-[#27272A]">
              <p className="text-xs text-[#A1A1AA]">
                No memberships are expiring in the next 7 days.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {stats.upcomingExpiries.map((item) => (
                <div
                  key={item.membership_id}
                  className="p-3.5 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-between gap-3 hover:border-[#E5B842]/30 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#F4F4F5] truncate">
                      {item.member_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#A1A1AA]">
                      <span>{item.plan_name}</span>
                      <span>&bull;</span>
                      <span>{item.member_phone}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[10px] font-bold text-[#F59E0B]">
                      {item.days_remaining === 0
                        ? 'Expires Today'
                        : `${item.days_remaining}d left`}
                    </span>
                    <p className="text-[10px] text-[#71717A] mt-0.5">
                      {formatDate(item.end_date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Daily Revenue Log Section */}
        <div className="card-luxury rounded-2xl p-6 bg-[#121214]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#F4F4F5] uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#E5B842]" />
                Recent Daily Collections
              </h2>
              <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                Aggregated collections derived from database view
              </p>
            </div>
            <Link
              href="/reports"
              className="text-xs text-[#E5B842] hover:underline flex items-center gap-1 font-medium"
            >
              Reports <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {dailyRevenue.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-[#18181B]/50 border border-[#27272A]">
              <p className="text-xs text-[#A1A1AA]">
                No payment transactions recorded yet.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {dailyRevenue.slice(0, 5).map((row) => (
                <div
                  key={row.report_date}
                  className="p-3.5 rounded-xl bg-[#18181B] border border-[#27272A] flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-xs font-semibold text-[#F4F4F5]">
                      {formatDate(row.report_date)}
                    </p>
                    <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                      {row.transaction_count} payment transaction{row.transaction_count > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-[#E5B842]">
                      {formatLKR(Number(row.total_revenue))}
                    </p>
                    <p className="text-[10px] text-[#71717A] mt-0.5">
                      Cash: {formatLKR(Number(row.cash_revenue))} &bull; Card: {formatLKR(Number(row.card_revenue))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

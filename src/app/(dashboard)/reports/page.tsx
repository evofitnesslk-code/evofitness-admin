import {
  getDailyRevenue,
  getWeeklyRevenue,
  getMonthlyRevenue,
  getMembershipStatusSummary,
  getUpcomingExpiries,
} from '@/app/actions/reports';
import { getCurrentUserProfile } from '@/app/actions/auth';
import Link from 'next/link';
import { ReportsViewClient } from '@/components/reports/reports-view-client';

export default async function ReportsPage() {
  const [daily, weekly, monthly, statusSummary, upcomingExpiries, { profile }] =
    await Promise.all([
      getDailyRevenue(),
      getWeeklyRevenue(),
      getMonthlyRevenue(),
      getMembershipStatusSummary(),
      getUpcomingExpiries(),
      getCurrentUserProfile(),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#F4F4F5]">
          Financial & Membership Reports
        </h1>
        <p className="text-xs text-[#A1A1AA] mt-0.5">
          Real-time aggregations from authoritative database views &middot; Balapokuna Road
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/reports/memberships" className="inline-flex min-h-11 items-center rounded-xl border border-[#E5B842]/35 px-4 text-sm font-medium text-[#F5D061] hover:border-[#E5B842]/60">
          Membership analysis
        </Link>
        <Link href="/reports/expiries" className="inline-flex min-h-11 items-center rounded-xl border border-[#E5B842]/35 px-4 text-sm font-medium text-[#F5D061] hover:border-[#E5B842]/60">
          Monthly expirations
        </Link>
      </div>

      <ReportsViewClient
        daily={daily}
        weekly={weekly}
        monthly={monthly}
        statusSummary={statusSummary}
        upcomingExpiries={upcomingExpiries}
        currentUserProfile={profile}
      />
    </div>
  );
}

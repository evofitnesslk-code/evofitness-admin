'use client';

import type { MembershipStatusSummary } from '@/types/database';

interface StatusDistributionChartProps {
  summary: MembershipStatusSummary[];
}

export function StatusDistributionChart({ summary }: StatusDistributionChartProps) {
  const totalCount = summary.reduce((acc, s) => acc + Number(s.total_memberships), 0);

  const active = summary.find((s) => s.status === 'active');
  const expired = summary.find((s) => s.status === 'expired');
  const cancelled = summary.find((s) => s.status === 'cancelled');

  const activeCount = Number(active?.total_memberships || 0);
  const expiredCount = Number(expired?.total_memberships || 0);
  const cancelledCount = Number(cancelled?.total_memberships || 0);

  const activePct = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;
  const expiredPct = totalCount > 0 ? Math.round((expiredCount / totalCount) * 100) : 0;
  const cancelledPct = totalCount > 0 ? Math.round((cancelledCount / totalCount) * 100) : 0;

  return (
    <div className="card-luxury rounded-2xl p-5 bg-[#121214] border border-[#27272A] space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#F4F4F5]">
            Membership Lifecycle Distribution
          </h3>
          <p className="text-[11px] text-[#A1A1AA]">
            Proportionate breakdown of member retention & order statuses
          </p>
        </div>
        <span className="text-xs font-bold text-[#E5B842]">
          {totalCount} Total Issued
        </span>
      </div>

      {/* Multi-segment Horizontal Progress Bar */}
      <div className="h-4 w-full rounded-full bg-[#18181B] border border-[#27272A] overflow-hidden flex shadow-inner">
        {activePct > 0 && (
          <div
            style={{ width: `${activePct}%` }}
            className="h-full bg-[#10B981] transition-all"
            title={`Active: ${activeCount} (${activePct}%)`}
          />
        )}
        {expiredPct > 0 && (
          <div
            style={{ width: `${expiredPct}%` }}
            className="h-full bg-[#71717A] transition-all"
            title={`Expired: ${expiredCount} (${expiredPct}%)`}
          />
        )}
        {cancelledPct > 0 && (
          <div
            style={{ width: `${cancelledPct}%` }}
            className="h-full bg-[#EF4444] transition-all"
            title={`Cancelled: ${cancelledCount} (${cancelledPct}%)`}
          />
        )}
      </div>

      {/* Legend & Stats */}
      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
        <div className="p-2 rounded-xl bg-[#18181B] border border-[#27272A]">
          <span className="text-[10px] text-[#10B981] font-bold block">
            ACTIVE ({activePct}%)
          </span>
          <span className="text-xs font-bold text-[#F4F4F5]">{activeCount} Orders</span>
        </div>

        <div className="p-2 rounded-xl bg-[#18181B] border border-[#27272A]">
          <span className="text-[10px] text-[#A1A1AA] font-bold block">
            EXPIRED ({expiredPct}%)
          </span>
          <span className="text-xs font-bold text-[#F4F4F5]">{expiredCount} Orders</span>
        </div>

        <div className="p-2 rounded-xl bg-[#18181B] border border-[#27272A]">
          <span className="text-[10px] text-[#EF4444] font-bold block">
            CANCELLED ({cancelledPct}%)
          </span>
          <span className="text-xs font-bold text-[#F4F4F5]">{cancelledCount} Orders</span>
        </div>
      </div>
    </div>
  );
}

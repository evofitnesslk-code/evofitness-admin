'use server';

import { createClient } from '@/lib/supabase/server';

export interface MembershipReportRow {
  month_start: string;
  plan_id: string;
  plan_name: string;
  target_group: string;
  duration_value: number;
  duration_type: string;
  status: 'active' | 'cancelled' | 'expired';
  memberships: number;
  plan_value: number;
  trainer_fees: number;
  pt_count: number;
  discounts: number;
  total_due: number;
  total_paid: number;
  refunds: number;
}

export async function getMembershipReport(
  from: string | null,
  to: string | null
): Promise<{ rows: MembershipReportRow[]; refreshedAt: string | null }> {
  const supabase = await createClient();

  // Refreshes the cached aggregate only if it is older than 10 minutes.
  const { data: refreshedAt } = await supabase.rpc('refresh_membership_report', {
    p_force: false,
  });

  const { data, error } = await supabase.rpc('get_membership_report', {
    p_from: from,
    p_to: to,
  });
  if (error) {
    console.error('Error fetching membership report:', error);
    return { rows: [], refreshedAt: null };
  }
  const rows = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    ...r,
    plan_value: Number(r.plan_value),
    trainer_fees: Number(r.trainer_fees),
    discounts: Number(r.discounts),
    total_due: Number(r.total_due),
    total_paid: Number(r.total_paid),
    refunds: Number(r.refunds),
  })) as MembershipReportRow[];
  return { rows, refreshedAt: (refreshedAt as string | null) ?? null };
}

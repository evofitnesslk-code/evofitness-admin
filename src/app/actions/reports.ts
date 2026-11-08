'use server';

import { createClient } from '@/lib/supabase/server';
import type {
  DailyRevenueReport,
  WeeklyRevenueReport,
  MonthlyRevenueReport,
  MembershipStatusSummary,
  UpcomingExpiry,
} from '@/types/database';

export async function getDailyRevenue(): Promise<DailyRevenueReport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('v_daily_revenue')
    .select('*')
    .limit(30);

  if (error) {
    console.error('Error fetching daily revenue:', error);
    return [];
  }
  return data as DailyRevenueReport[];
}

export async function getWeeklyRevenue(): Promise<WeeklyRevenueReport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('v_weekly_revenue')
    .select('*')
    .limit(12);

  if (error) {
    console.error('Error fetching weekly revenue:', error);
    return [];
  }
  return data as WeeklyRevenueReport[];
}

export async function getMonthlyRevenue(): Promise<MonthlyRevenueReport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('v_monthly_revenue')
    .select('*')
    .limit(12);

  if (error) {
    console.error('Error fetching monthly revenue:', error);
    return [];
  }
  return data as MonthlyRevenueReport[];
}

export async function getMembershipStatusSummary(): Promise<MembershipStatusSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('v_membership_status_summary')
    .select('*');

  if (error) {
    console.error('Error fetching status summary:', error);
    return [];
  }
  return data as MembershipStatusSummary[];
}

export async function getUpcomingExpiries(): Promise<UpcomingExpiry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('v_upcoming_expiries')
    .select('*');

  if (error) {
    console.error('Error fetching upcoming expiries:', error);
    return [];
  }
  return data as UpcomingExpiry[];
}

export async function getDashboardStats() {
  const supabase = await createClient();

  // 1. Total Members
  const { count: totalMembers } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true });

  // 2. Active Memberships
  const { count: activeMemberships } = await supabase
    .from('memberships')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  // 3. Today's Revenue
  const today = new Date().toISOString().split('T')[0];
  const { data: todayPayments } = await supabase
    .from('payments')
    .select('amount, payment_method')
    .gte('payment_date', `${today}T00:00:00.000Z`);

  const todayRevenue = (todayPayments || []).reduce(
    (acc, p) => acc + Number(p.amount),
    0
  );
  const todayCash = (todayPayments || []).filter(p => p.payment_method === 'cash').reduce((a, b) => a + Number(b.amount), 0);
  const todayCard = (todayPayments || []).filter(p => p.payment_method === 'card').reduce((a, b) => a + Number(b.amount), 0);
  const todayBank = (todayPayments || []).filter(p => p.payment_method === 'bank').reduce((a, b) => a + Number(b.amount), 0);

  // 4. Upcoming expiries (7 days)
  const upcomingExpiries = await getUpcomingExpiries();

  return {
    totalMembers: totalMembers || 0,
    activeMemberships: activeMemberships || 0,
    todayRevenue,
    todayCash,
    todayCard,
    todayBank,
    upcomingExpiriesCount: upcomingExpiries.length,
    upcomingExpiries: upcomingExpiries.slice(0, 5),
  };
}

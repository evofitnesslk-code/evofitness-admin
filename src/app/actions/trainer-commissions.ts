'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserProfile } from '@/app/actions/auth';
import { isAdminRole } from '@/lib/roles';
import { revalidatePath } from 'next/cache';

export interface TrainerCommissionSummary {
  trainer_id: string;
  name: string;
  is_active: boolean;
  commission_rate: number;
  memberships: number;
  active_memberships: number;
  cancelled_memberships: number;
  members: number;
  pt_gross: number;
  pt_net: number;
  pt_collected: number;
  commission_earned: number;
  commission_pending: number;
  period_paid: number;
  alltime_earned: number;
  alltime_paid: number;
  balance: number;
}

export interface TrainerCommissionLine {
  membership_id: string;
  invoice_number: string;
  trainer_id: string;
  trainer_name: string;
  member_name: string;
  plan_name: string;
  start_date: string;
  status: 'active' | 'cancelled' | 'expired';
  trainer_fee: number;
  discount_share: number;
  net_pt_fee: number;
  total_due: number;
  paid_gross: number;
  refund_amount: number;
  collected_net: number;
  rate: number;
  commission_earned: number;
  commission_potential: number;
}

export interface TrainerPayout {
  id: string;
  trainer_id: string;
  amount: number;
  payment_method: 'cash' | 'bank';
  paid_at: string;
  notes: string | null;
  voided_at: string | null;
  void_reason: string | null;
  created_at: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const cleanDate = (v?: string | null) => (v && ISO_DATE.test(v) ? v : null);

const num = (v: unknown) => Number(v ?? 0);

async function requireAdmin() {
  const { profile } = await getCurrentUserProfile();
  return isAdminRole(profile?.role);
}

export async function getTrainerCommissionSummary(
  from?: string | null,
  to?: string | null
): Promise<{ rows: TrainerCommissionSummary[]; error?: string }> {
  if (!(await requireAdmin())) return { rows: [], error: 'forbidden' };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('trainer_commission_summary', {
    p_from: cleanDate(from),
    p_to: cleanDate(to),
  });
  if (error) {
    console.error('trainer_commission_summary failed:', error);
    return { rows: [], error: error.message };
  }
  const rows = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    ...r,
    commission_rate: num(r.commission_rate),
    pt_gross: num(r.pt_gross),
    pt_net: num(r.pt_net),
    pt_collected: num(r.pt_collected),
    commission_earned: num(r.commission_earned),
    commission_pending: num(r.commission_pending),
    period_paid: num(r.period_paid),
    alltime_earned: num(r.alltime_earned),
    alltime_paid: num(r.alltime_paid),
    balance: num(r.balance),
  })) as TrainerCommissionSummary[];
  return { rows };
}

export async function getTrainerCommissionLines(
  trainerId: string | null,
  from?: string | null,
  to?: string | null
): Promise<{ rows: TrainerCommissionLine[]; error?: string }> {
  if (!(await requireAdmin())) return { rows: [], error: 'forbidden' };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('trainer_commission_lines', {
    p_trainer_id: trainerId,
    p_from: cleanDate(from),
    p_to: cleanDate(to),
  });
  if (error) {
    console.error('trainer_commission_lines failed:', error);
    return { rows: [], error: error.message };
  }
  const rows = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    ...r,
    trainer_fee: num(r.trainer_fee),
    discount_share: num(r.discount_share),
    net_pt_fee: num(r.net_pt_fee),
    total_due: num(r.total_due),
    paid_gross: num(r.paid_gross),
    refund_amount: num(r.refund_amount),
    collected_net: num(r.collected_net),
    rate: num(r.rate),
    commission_earned: num(r.commission_earned),
    commission_potential: num(r.commission_potential),
  })) as TrainerCommissionLine[];
  return { rows };
}

export async function getTrainerPayouts(trainerId: string): Promise<TrainerPayout[]> {
  if (!(await requireAdmin())) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trainer_payouts')
    .select('id, trainer_id, amount, payment_method, paid_at, notes, voided_at, void_reason, created_at')
    .eq('trainer_id', trainerId)
    .order('paid_at', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching trainer payouts:', error);
    return [];
  }
  return (data ?? []).map((p) => ({ ...p, amount: Number(p.amount) })) as TrainerPayout[];
}

export async function recordTrainerPayout(input: {
  trainer_id: string;
  amount: number;
  payment_method: 'cash' | 'bank';
  paid_at: string;
  notes?: string;
  request_key: string;
}): Promise<{ success?: true; error?: string }> {
  if (!(await requireAdmin())) return { error: 'Only administrators can record trainer payouts.' };
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { error: 'Enter a payout amount greater than zero.' };
  }
  if (!cleanDate(input.paid_at)) return { error: 'Choose a valid payout date.' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('record_trainer_payout', {
    p_trainer_id: input.trainer_id,
    p_amount: Math.round(input.amount * 100) / 100,
    p_method: input.payment_method,
    p_paid_at: input.paid_at,
    p_notes: input.notes?.trim() || null,
    p_request_key: input.request_key,
  });
  if (error) return { error: error.message };

  revalidatePath(`/trainers/${input.trainer_id}`);
  revalidatePath('/reports/trainers');
  return { success: true };
}

export async function voidTrainerPayout(
  payoutId: string,
  trainerId: string,
  reason: string
): Promise<{ success?: true; error?: string }> {
  if (!(await requireAdmin())) return { error: 'Only administrators can void payouts.' };
  if (!reason.trim()) return { error: 'A reason is required to void a payout.' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('void_trainer_payout', {
    p_payout_id: payoutId,
    p_reason: reason,
  });
  if (error) return { error: error.message };

  revalidatePath(`/trainers/${trainerId}`);
  revalidatePath('/reports/trainers');
  return { success: true };
}

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendMembershipInvoiceEmail } from '@/app/actions/memberships';
import type {
  Payment,
  PaymentMethod,
  Member,
  Membership,
  MembershipPlan,
  PendingPayment,
} from '@/types/database';

export async function recordPayment(formData: {
  membership_id: string;
  amount: number;
  payment_method: PaymentMethod;
  notes?: string;
  /** Client-generated key so a double-click / retry cannot record twice. */
  request_key?: string;
  /** Optional promised-by date (YYYY-MM-DD) for the remaining balance. */
  balance_due_date?: string | null;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be authenticated to record a payment.' };
  }

  const amount = Number(formData.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'Payment amount must be greater than zero.' };
  }

  // Validation, locking, overpayment/cancelled checks, idempotency and the audit
  // entry all happen atomically inside the database function.
  const { data, error } = await supabase.rpc('record_membership_payment', {
    p_membership_id: formData.membership_id,
    p_amount: amount,
    p_method: formData.payment_method,
    p_notes: formData.notes?.trim() || null,
    p_request_key: formData.request_key || null,
    p_balance_due_date: formData.balance_due_date || null,
  });

  if (error) {
    return { error: error.message };
  }

  const result = data as {
    payment_id: string;
    duplicate: boolean;
    paid: number;
    balance: number;
  };

  // Email the per-installment receipt (paid to date + remaining balance). Skipped
  // for a replayed request so a retry never sends a second email.
  if (!result.duplicate) {
    sendMembershipInvoiceEmail(formData.membership_id, {
      thisPayment: amount,
      paymentMethod: formData.payment_method,
    }).catch((emailErr) => {
      console.error('Payment receipt email failed to send:', emailErr);
    });
  }

  revalidatePath('/payments');
  revalidatePath('/payments/pending');
  revalidatePath('/memberships');
  revalidatePath(`/memberships/${formData.membership_id}`);
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  return {
    success: true,
    duplicate: result.duplicate,
    paymentId: result.payment_id,
    paid: Number(result.paid),
    balance: Number(result.balance),
  };
}

export async function setBalanceDueDate(
  membershipId: string,
  dueDate: string | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be authenticated.' };

  const { error } = await supabase.rpc('set_balance_due_date', {
    p_membership_id: membershipId,
    p_due_date: dueDate || null,
  });
  if (error) return { error: error.message };

  revalidatePath('/payments/pending');
  revalidatePath(`/memberships/${membershipId}`);
  return { success: true };
}

export async function getPendingPayments(): Promise<PendingPayment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('v_pending_payments')
    .select('*')
    .neq('payment_status', 'cancelled')
    .order('balance_due_date', { ascending: true, nullsFirst: false })
    .order('start_date', { ascending: true });

  if (error) {
    console.error('Error fetching pending payments:', error);
    return [];
  }
  return (data ?? []).map((r) => ({
    ...r,
    total_due: Number(r.total_due),
    paid: Number(r.paid),
    balance: Number(r.balance),
  })) as PendingPayment[];
}

export async function getPayments(params?: {
  membership_id?: string;
  limit?: number;
}) {
  const supabase = await createClient();

  let query = supabase
    .from('payments')
    .select(`
      *,
      membership:memberships(
        id,
        invoice_number,
        total_due,
        status,
        member:members(id, full_name, phone, email),
        plan:membership_plans(id, name)
      )
    `)
    .order('payment_date', { ascending: false });

  if (params?.membership_id) {
    query = query.eq('membership_id', params.membership_id);
  }

  if (params?.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching payments:', error);
    return [];
  }

  type PaymentWithMembership = Payment & {
    membership:
      | (Pick<Membership, 'id' | 'invoice_number' | 'total_due' | 'status'> & {
          member: Pick<Member, 'id' | 'full_name' | 'phone' | 'email'> | null;
          plan: Pick<MembershipPlan, 'id' | 'name'> | null;
        })
      | null;
  };
  return data as PaymentWithMembership[];
}

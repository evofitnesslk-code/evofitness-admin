'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Payment, PaymentMethod, Member, Membership, MembershipPlan } from '@/types/database';

export async function recordPayment(formData: {
  membership_id: string;
  amount: number;
  payment_method: PaymentMethod;
  notes?: string;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be authenticated to record a payment.' };
  }

  const amount = Number(formData.amount);
  if (isNaN(amount) || amount <= 0) {
    return { error: 'Payment amount must be greater than zero.' };
  }

  // Fetch the membership and existing payments
  const { data: membership, error: memErr } = await supabase
    .from('memberships')
    .select('*, member:members(id, full_name, email), payments(*)')
    .eq('id', formData.membership_id)
    .single();

  if (memErr || !membership) {
    return { error: 'Membership not found.' };
  }

  if (membership.status === 'cancelled') {
    return { error: 'Cannot record payments against a cancelled membership.' };
  }

  const recordedPayments = (membership.payments ?? []) as Array<Pick<Payment, 'amount'>>;
  const totalPaid = recordedPayments.reduce(
    (sum: number, p: Pick<Payment, 'amount'>) => sum + Number(p.amount),
    0
  );
  const remaining = Number(membership.total_due) - totalPaid;

  if (amount > remaining) {
    return {
      error: `Payment amount (LKR ${amount.toLocaleString()}) exceeds the outstanding balance (LKR ${remaining.toLocaleString()}).`,
    };
  }

  // Insert payment
  const { data: newPayment, error: payErr } = await supabase
    .from('payments')
    .insert([
      {
        membership_id: formData.membership_id,
        amount: amount,
        payment_method: formData.payment_method,
        notes: formData.notes?.trim() || null,
        recorded_by: user.id,
      },
    ])
    .select()
    .single();

  if (payErr) {
    return { error: payErr.message };
  }

  // Audit log
  await supabase.from('audit_log').insert([
    {
      action: 'record_payment',
      entity_type: 'payments',
      entity_id: newPayment.id,
      user_id: user.id,
      details: {
        membership_id: formData.membership_id,
        amount,
        payment_method: formData.payment_method,
      },
    },
  ]);

  // Queue notification if member email exists
  if (membership.member?.email) {
    await supabase.from('notifications').insert([
      {
        member_id: membership.member.id,
        channel: 'email',
        type: 'invoice_receipt',
        status: 'queued',
        recipient_email: membership.member.email,
        subject: `Payment Receipt: ${membership.invoice_number} - EVO Fitness`,
        payload: {
          invoice_number: membership.invoice_number,
          amount_paid: amount,
          payment_method: formData.payment_method,
          outstanding_balance: remaining - amount,
          member_name: membership.member.full_name,
        },
      },
    ]);
  }

  revalidatePath('/payments');
  revalidatePath('/memberships');
  revalidatePath(`/memberships/${formData.membership_id}`);
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  return { success: true, payment: newPayment };
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

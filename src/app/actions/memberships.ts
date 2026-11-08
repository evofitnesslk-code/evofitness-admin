'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Membership, DiscountType, PaymentMethod, Payment } from '@/types/database';
import { addDays, addMonths, format } from 'date-fns';
import { sendInvoiceEmail } from '@/lib/email/resend';

export interface CreateMembershipInput {
  member_id: string;
  plan_id: string;
  start_date: string;
  trainer_id?: string | null;
  trainer_fee?: number;
  discount_type: DiscountType;
  discount_value?: number;
  discount_reason?: string;
  custom_invoice_number?: string;
  /**
   * The reviewed application this order was created from. When present, every
   * member linked to that application (the primary plus each additional
   * applicant) is attached to the new membership.
   */
  registration_id?: string | null;
  initial_payment?: {
    amount: number;
    payment_method: PaymentMethod;
    notes?: string;
  };
}

export async function getNextInvoiceNumber(): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_next_invoice_number');
  if (error || !data) {
    // Fallback if rpc error
    const { data: rows } = await supabase
      .from('memberships')
      .select('invoice_number')
      .order('created_at', { ascending: false })
      .limit(1);

    if (rows && rows.length > 0 && rows[0].invoice_number) {
      const match = rows[0].invoice_number.match(/^EF(\d+)$/);
      if (match) {
        const next = parseInt(match[1], 10) + 1;
        return `EF${String(next).padStart(4, '0')}`;
      }
    }
    return 'EF0001';
  }

  return data as string;
}

export async function getMemberships(params?: {
  status?: string;
  search?: string;
}) {
  const supabase = await createClient();

  let query = supabase
    .from('memberships')
    .select(`
      *,
      member:members(*),
      plan:membership_plans(*),
      trainer:trainers(*),
      payments(*)
    `)
    .order('created_at', { ascending: false });

  if (params?.status && params.status !== 'all') {
    query = query.eq('status', params.status);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching memberships:', error);
    return [];
  }

  type MembershipRow = Membership & {
    payments?: Array<Pick<Payment, 'amount'>> | null;
  };
  const result: Membership[] = ((data || []) as MembershipRow[]).map((m) => {
    const paid = (m.payments || []).reduce(
      (sum: number, p: Pick<Payment, 'amount'>) => sum + Number(p.amount),
      0
    );
    const balance = Math.max(0, Number(m.total_due) - paid);

    // Dynamic check if expired
    let currentStatus = m.status;
    if (
      currentStatus === 'active' &&
      new Date(m.end_date) < new Date(new Date().setHours(0, 0, 0, 0))
    ) {
      currentStatus = 'expired';
    }

    return {
      ...m,
      status: currentStatus,
      paid_amount: paid,
      outstanding_balance: balance,
    };
  });

  if (params?.search && params.search.trim().length > 0) {
    const s = params.search.trim().toLowerCase();
    return result.filter(
      (m) =>
        m.invoice_number.toLowerCase().includes(s) ||
        m.member?.full_name.toLowerCase().includes(s) ||
        m.member?.phone.includes(s) ||
        m.plan?.name.toLowerCase().includes(s)
    );
  }

  return result;
}

export async function getMembershipById(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('memberships')
    .select(`
      *,
      member:members(*),
      plan:membership_plans(*),
      trainer:trainers(*),
      payments(*)
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  const memberPayments = (data.payments ?? []) as Array<Pick<Payment, 'amount'>>;
  const paid = memberPayments.reduce(
    (sum: number, p: Pick<Payment, 'amount'>) => sum + Number(p.amount),
    0
  );
  const balance = Math.max(0, Number(data.total_due) - paid);

  return {
    ...data,
    paid_amount: paid,
    outstanding_balance: balance,
  } as Membership;
}

export async function createMembership(input: CreateMembershipInput) {
  const supabase = await createClient();

  // Get current user and profile for RBAC
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be authenticated to create a membership.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';

  // 1. Fetch the selected plan
  const { data: plan, error: planErr } = await supabase
    .from('membership_plans')
    .select('*')
    .eq('id', input.plan_id)
    .single();

  if (planErr || !plan) {
    return { error: 'Selected membership plan was not found.' };
  }

  // 2. Resolve PT trainer and fee
  let trainerFee = 0;
  if (input.trainer_id) {
    trainerFee = Number(input.trainer_fee ?? 0);
    if (trainerFee < 0) {
      return { error: 'Personal Trainer fee cannot be negative.' };
    }
  }

  // 3. Calculate subtotal
  const planPrice = Number(plan.price);
  const subtotal = planPrice + trainerFee;

  // 4. Calculate discount
  let discountAmount = 0;
  const discountType = input.discount_type || 'none';
  const discountValue = Number(input.discount_value || 0);

  if (discountType === 'percentage') {
    if (discountValue <= 0 || discountValue > 100) {
      return { error: 'Discount percentage must be between 1% and 100%.' };
    }
    // Check staff discount threshold (max 15% for staff without admin, except authorized First 100 30% promotion)
    if (!isAdmin && discountValue > 15 && !(discountValue === 30 && input.discount_reason?.includes('First 100'))) {
      return {
        error:
          'Staff discount threshold exceeded. Percentage discount above 15% requires Admin approval.',
      };
    }
    discountAmount = Math.round((subtotal * discountValue) / 100);
  } else if (discountType === 'fixed') {
    if (discountValue <= 0 || discountValue > subtotal) {
      return {
        error:
          'Fixed discount amount must be greater than 0 and cannot exceed the subtotal.',
      };
    }
    // Check staff fixed threshold (max 10,000 LKR for staff)
    if (!isAdmin && discountValue > 10000) {
      return {
        error:
          'Staff discount threshold exceeded. Fixed discount above LKR 10,000 requires Admin approval.',
      };
    }
    discountAmount = discountValue;
  }

  if (discountType !== 'none' && !input.discount_reason?.trim()) {
    return { error: 'Discount reason is strictly required for auditability.' };
  }

  const totalDue = Math.max(0, subtotal - discountAmount);

  // 5. Invoice Number handling
  let invoiceNumber = '';
  if (input.custom_invoice_number && input.custom_invoice_number.trim()) {
    // Only admin can override invoice number
    if (!isAdmin) {
      return {
        error:
          'Staff cannot manually override invoice numbers. Invoice numbers are strictly auto-incremented.',
      };
    }
    const cleanInv = input.custom_invoice_number.trim().toUpperCase();
    if (!cleanInv.startsWith('EF')) {
      return { error: 'Invoice number must start with prefix "EF".' };
    }
    invoiceNumber = cleanInv;
  } else {
    invoiceNumber = await getNextInvoiceNumber();
  }

  // Check invoice uniqueness
  const { data: existingInv } = await supabase
    .from('memberships')
    .select('id')
    .eq('invoice_number', invoiceNumber)
    .single();

  if (existingInv) {
    return {
      error: `Invoice number ${invoiceNumber} already exists. Please choose a different number.`,
    };
  }

  // 6. Calculate End Date based on Plan duration
  const startDate = new Date(input.start_date);
  let endDate: Date;
  if (plan.duration_type === 'days') {
    endDate = addDays(startDate, plan.duration_value);
  } else {
    endDate = addMonths(startDate, plan.duration_value);
  }

  const formattedStartDate = format(startDate, 'yyyy-MM-dd');
  const formattedEndDate = format(endDate, 'yyyy-MM-dd');

  // 7. Insert Membership Record
  const { data: newMembership, error: insertErr } = await supabase
    .from('memberships')
    .insert([
      {
        invoice_number: invoiceNumber,
        member_id: input.member_id,
        plan_id: input.plan_id,
        trainer_id: input.trainer_id || null,
        trainer_fee: trainerFee,
        plan_price: planPrice,
        subtotal: subtotal,
        discount_type: discountType,
        discount_value: discountValue,
        discount_amount: discountAmount,
        discount_reason: input.discount_reason?.trim() || null,
        total_due: totalDue,
        start_date: formattedStartDate,
        end_date: formattedEndDate,
        status: 'active',
        created_by: user.id,
        registration_id: input.registration_id || null,
      },
    ])
    .select()
    .single();

  if (insertErr) {
    return { error: insertErr.message };
  }

  // 7b. Link every person the membership covers to a `membership_members` row.
  // For an order created from an application this is the primary member plus
  // each additional applicant; a manual order links just its primary member.
  // member_id and every value here are resolved server-side - the browser only
  // ever passes the registration id.
  const linkRows: Array<{ membership_id: string; member_id: string; is_primary: boolean }> = [];
  const seenMemberIds = new Set<string>();

  const addLink = (memberId: string | null | undefined, isPrimary: boolean) => {
    if (!memberId || seenMemberIds.has(memberId)) return;
    seenMemberIds.add(memberId);
    linkRows.push({ membership_id: newMembership.id, member_id: memberId, is_primary: isPrimary });
  };

  if (input.registration_id) {
    const { data: registrationRow } = await supabase
      .from('member_registrations')
      .select('id, member_id')
      .eq('id', input.registration_id)
      .maybeSingle();

    const { data: applicantRows } = await supabase
      .from('member_registration_applicants')
      .select('member_id, position')
      .eq('registration_id', input.registration_id)
      .not('member_id', 'is', null)
      .order('position', { ascending: true });

    addLink(registrationRow?.member_id ?? input.member_id, true);
    for (const applicant of applicantRows || []) {
      addLink(applicant.member_id as string | null, false);
    }
  } else {
    addLink(input.member_id, true);
  }

  if (linkRows.length === 0) {
    await supabase.from('memberships').delete().eq('id', newMembership.id);
    return {
      error: 'This application has no members linked to it yet. Approve the application before creating the membership.',
    };
  }

  const { error: linkErr } = await supabase
    .from('membership_members')
    .upsert(linkRows, { onConflict: 'membership_id,member_id', ignoreDuplicates: true });

  if (linkErr) {
    console.error('Failed to link members to membership:', linkErr);
    await supabase.from('memberships').delete().eq('id', newMembership.id);
    return { error: linkErr.message };
  }

  // 8. If initial payment provided, record it
  if (
    input.initial_payment &&
    input.initial_payment.amount &&
    input.initial_payment.amount > 0
  ) {
    if (input.initial_payment.amount > totalDue) {
      return {
        error:
          'Initial payment amount cannot exceed the total amount due for this membership.',
      };
    }

    await supabase.from('payments').insert([
      {
        membership_id: newMembership.id,
        amount: input.initial_payment.amount,
        payment_method: input.initial_payment.payment_method,
        notes: input.initial_payment.notes || 'Initial down payment at registration',
        recorded_by: user.id,
      },
    ]);
  }

  // Record audit log
  await supabase.from('audit_log').insert([
    {
      action: 'create_membership',
      entity_type: 'memberships',
      entity_id: newMembership.id,
      user_id: user.id,
      user_role: profile?.role,
      details: {
        invoice_number: invoiceNumber,
        total_due: totalDue,
        discount_type: discountType,
        discount_amount: discountAmount,
      },
    },
  ]);

  // 9. Automatically dispatch invoice receipt email if member has email
  if (input.member_id) {
    sendMembershipInvoiceEmail(newMembership.id).catch((emailErr) => {
      console.error('Automatic invoice receipt email failed to send:', emailErr);
    });
  }

  revalidatePath('/memberships');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  return { success: true, membership: newMembership };
}

export async function cancelMembership(
  membershipId: string,
  reason: string,
  refundAmount: number = 0
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be authenticated.' };
  }

  if (!reason || !reason.trim()) {
    return { error: 'Cancellation reason is strictly required.' };
  }

  // Fetch membership with payments
  const { data: membership, error: fetchErr } = await supabase
    .from('memberships')
    .select('*, payments(*)')
    .eq('id', membershipId)
    .single();

  if (fetchErr || !membership) {
    return { error: 'Membership not found.' };
  }

  if (membership.status === 'cancelled') {
    return { error: 'This membership is already cancelled.' };
  }

  const cancelPayments = (membership.payments ?? []) as Array<Pick<Payment, 'amount'>>;
  const totalPaid = cancelPayments.reduce(
    (sum: number, p: Pick<Payment, 'amount'>) => sum + Number(p.amount),
    0
  );

  if (refundAmount < 0) {
    return { error: 'Refund amount cannot be negative.' };
  }

  if (refundAmount > totalPaid) {
    return {
      error: `Refund amount (LKR ${refundAmount}) cannot exceed total amount paid (LKR ${totalPaid}).`,
    };
  }

  const { error: updateErr } = await supabase
    .from('memberships')
    .update({
      status: 'cancelled',
      cancellation_reason: reason.trim(),
      cancelled_at: new Date().toISOString(),
      refund_amount: refundAmount,
    })
    .eq('id', membershipId);

  if (updateErr) {
    return { error: updateErr.message };
  }

  // Record audit log
  await supabase.from('audit_log').insert([
    {
      action: 'cancel_membership',
      entity_type: 'memberships',
      entity_id: membershipId,
      user_id: user.id,
      details: {
        cancellation_reason: reason.trim(),
        refund_amount: refundAmount,
      },
    },
  ]);

  revalidatePath('/memberships');
  revalidatePath(`/memberships/${membershipId}`);
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  return { success: true };
}

export async function sendMembershipInvoiceEmail(membershipId: string) {
  const membership = await getMembershipById(membershipId);
  if (!membership) {
    return { error: 'Membership record not found.' };
  }

  if (!membership.member?.email) {
    return { error: 'Member does not have an email address on file.' };
  }

  const result = await sendInvoiceEmail({
    to: membership.member.email,
    memberName: membership.member.full_name,
    phone: membership.member.phone,
    email: membership.member.email,
    invoiceNumber: membership.invoice_number,
    planName: membership.plan?.name || 'Membership Plan',
    amountPaid: membership.paid_amount ?? 0,
    outstandingBalance: membership.outstanding_balance ?? 0,
    totalDue: Number(membership.total_due),
    discountAmount: Number(membership.discount_amount) || 0,
    trainerFee: Number(membership.trainer_fee) || 0,
    trainerName: membership.trainer?.name,
    startDate: membership.start_date,
    endDate: membership.end_date,
  });

  if (!result.success) {
    const errRecord = result.error as { message?: unknown };
    const errorMsg =
      typeof result.error === 'object' && result.error !== null && typeof errRecord.message === 'string'
        ? errRecord.message
        : String(result.error || result.reason || 'Failed to send email via Resend.');
    return { error: errorMsg };
  }

  return { success: true, email: membership.member.email };
}

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail, formatEmailError } from '@/lib/email/resend';
import { expiryReminderHtml, expiryReminderSubject } from '@/lib/email/expiry-emails';

export interface ExpiringMembershipRow {
  membership_id: string;
  invoice_number: string;
  end_date: string;
  days_remaining: number;
  plan_name: string;
  total_due: number;
  members: { id: string; name: string; phone: string; email: string | null }[];
}

function monthBounds(month: string) {
  // month = YYYY-MM
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(start), to: iso(end) };
}

export async function getExpiringMemberships(month: string): Promise<ExpiringMembershipRow[]> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return [];
  const { from, to } = monthBounds(month);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('memberships')
    .select(
      `id, invoice_number, end_date, total_due,
       plan:membership_plans(name),
       member:members(id, full_name, phone, email),
       extra:membership_members(member:members(id, full_name, phone, email))`
    )
    .eq('status', 'active')
    .gte('end_date', from)
    .lte('end_date', to)
    .order('end_date');

  if (error) {
    console.error('Error fetching expiring memberships:', error);
    return [];
  }

  const today = new Date().toISOString().slice(0, 10);
  const dayMs = 86_400_000;
  type Person = { id: string; full_name: string; phone: string; email: string | null };
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

  return (data ?? []).map((row) => {
    const r = row as unknown as {
      id: string;
      invoice_number: string;
      end_date: string;
      total_due: number;
      plan: { name: string } | { name: string }[] | null;
      member: Person | Person[] | null;
      extra: { member: Person | Person[] | null }[] | null;
    };
    const seen = new Map<string, Person>();
    const primary = one(r.member);
    if (primary) seen.set(primary.id, primary);
    for (const e of r.extra ?? []) {
      const p = one(e.member);
      if (p) seen.set(p.id, p);
    }
    return {
      membership_id: r.id,
      invoice_number: r.invoice_number,
      end_date: r.end_date,
      days_remaining: Math.round(
        (Date.parse(r.end_date) - Date.parse(today)) / dayMs
      ),
      plan_name: one(r.plan)?.name ?? '-',
      total_due: Number(r.total_due),
      members: [...seen.values()].map((p) => ({
        id: p.id,
        name: p.full_name,
        phone: p.phone,
        email: p.email,
      })),
    };
  });
}

export interface SendExpiryResult {
  sent: number;
  skippedNoEmail: number;
  failed: number;
  error?: string;
}

/**
 * Sends the expiry reminder for the selected memberships right now. Each
 * recipient is logged in `notifications`; the per-day dedupe key makes a
 * double-click (or retry) harmless.
 */
export async function sendExpiryEmails(membershipIds: string[]): Promise<SendExpiryResult> {
  const result: SendExpiryResult = { sent: 0, skippedNoEmail: 0, failed: 0 };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ...result, error: 'Not signed in.' };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile) return { ...result, error: 'No access.' };

  const ids = [...new Set(membershipIds)].slice(0, 200);
  if (ids.length === 0) return { ...result, error: 'Nothing selected.' };

  // Re-read through the user's session (RLS) rather than trusting client data.
  const { data } = await supabase
    .from('memberships')
    .select(
      `id, invoice_number, end_date, status,
       plan:membership_plans(name),
       member:members(id, full_name, email),
       extra:membership_members(member:members(id, full_name, email))`
    )
    .in('id', ids)
    .eq('status', 'active');

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  type Person = { id: string; full_name: string; email: string | null };
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

  for (const row of data ?? []) {
    const r = row as unknown as {
      id: string;
      invoice_number: string;
      end_date: string;
      plan: { name: string } | { name: string }[] | null;
      member: Person | Person[] | null;
      extra: { member: Person | Person[] | null }[] | null;
    };
    const people = new Map<string, Person>();
    const primary = one(r.member);
    if (primary) people.set(primary.id, primary);
    for (const e of r.extra ?? []) {
      const p = one(e.member);
      if (p) people.set(p.id, p);
    }
    const planName = one(r.plan)?.name ?? 'Membership';
    const daysRemaining = Math.round((Date.parse(r.end_date) - Date.parse(today)) / 86_400_000);

    for (const person of people.values()) {
      const email = person.email?.trim();
      if (!email) {
        result.skippedNoEmail++;
        continue;
      }
      const subject = expiryReminderSubject(r.end_date);
      const { data: row, error: insertError } = await admin
        .from('notifications')
        .insert({
          member_id: person.id,
          channel: 'email',
          type: 'expiry_warning',
          status: 'processing',
          recipient_email: email,
          subject,
          payload: {
            member_name: person.full_name,
            plan_name: planName,
            end_date: r.end_date,
            invoice_number: r.invoice_number,
            days_remaining: daysRemaining,
            manual: true,
          },
          dedupe_key: `expiry_manual:${r.id}:${person.id}:${today}`,
        })
        .select('id')
        .single();

      // Unique violation = already sent today; skip silently.
      if (insertError || !row) continue;

      const sendResult = await sendEmail({
        to: email,
        subject,
        html: expiryReminderHtml({
          memberName: person.full_name,
          planName,
          endDate: r.end_date,
          daysRemaining,
          invoiceNumber: r.invoice_number,
        }),
      });

      if (sendResult.success) {
        result.sent++;
        await admin
          .from('notifications')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', row.id);
      } else {
        result.failed++;
        const reason = 'reason' in sendResult ? sendResult.reason : formatEmailError(sendResult.error);
        await admin
          .from('notifications')
          .update({ status: 'failed', error_message: reason })
          .eq('id', row.id);
      }
    }
  }

  revalidatePath('/reports/expiries');
  return result;
}

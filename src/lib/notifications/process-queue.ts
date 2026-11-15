import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail, formatEmailError } from '@/lib/email/resend';
import { expiryReminderHtml } from '@/lib/email/expiry-emails';

interface QueuedRow {
  id: string;
  recipient_email: string;
  subject: string;
  payload: {
    member_name?: string;
    plan_name?: string;
    end_date?: string;
    invoice_number?: string;
    days_remaining?: number;
  } | null;
}

/**
 * Sends queued `expiry_warning` notifications. Rows are claimed with an atomic
 * `queued -> processing` update so overlapping runs never send the same row
 * twice; failures are stored as `failed` with the error text for diagnosis.
 */
export async function processExpiryNotifications(
  admin: SupabaseClient,
  limit = 100
): Promise<{ sent: number; failed: number }> {
  const { data: candidates } = await admin
    .from('notifications')
    .select('id')
    .eq('type', 'expiry_warning')
    .eq('status', 'queued')
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at')
    .limit(limit);

  const ids = (candidates ?? []).map((row) => row.id as string);
  if (ids.length === 0) return { sent: 0, failed: 0 };

  const { data: claimed } = await admin
    .from('notifications')
    .update({ status: 'processing' })
    .in('id', ids)
    .eq('status', 'queued')
    .select('id, recipient_email, subject, payload');

  let sent = 0;
  let failed = 0;
  for (const row of (claimed ?? []) as QueuedRow[]) {
    const p = row.payload ?? {};
    const result = await sendEmail({
      to: row.recipient_email,
      subject: row.subject,
      html: expiryReminderHtml({
        memberName: p.member_name ?? 'there',
        planName: p.plan_name ?? 'Membership',
        endDate: p.end_date ?? '',
        daysRemaining: p.days_remaining,
        invoiceNumber: p.invoice_number,
      }),
    });

    if (result.success) {
      sent++;
      await admin
        .from('notifications')
        .update({ status: 'sent', sent_at: new Date().toISOString(), error_message: null })
        .eq('id', row.id);
    } else {
      failed++;
      const reason = 'reason' in result ? result.reason : formatEmailError(result.error);
      await admin
        .from('notifications')
        .update({ status: 'failed', error_message: reason })
        .eq('id', row.id);
    }
  }
  return { sent, failed };
}

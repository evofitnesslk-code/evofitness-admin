import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processExpiryNotifications } from '@/lib/notifications/process-queue';

export const dynamic = 'force-dynamic';

const REMINDER_DAYS = 10;

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Daily job: queue 10-day expiry reminders, send everything queued, and
 * refresh the cached membership report. Safe to run repeatedly.
 */
export async function GET(request: NextRequest) {
  if (!authorised(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const admin = createAdminClient();
    const { data: queued, error } = await admin.rpc('queue_expiry_reminders', {
      p_days: REMINDER_DAYS,
    });
    if (error) throw error;
    const result = await processExpiryNotifications(admin);
    await admin.rpc('refresh_membership_report', { p_force: true });
    return NextResponse.json({ queued, ...result });
  } catch (err) {
    console.error('expiry-reminders cron failed:', err);
    return NextResponse.json({ error: 'Job failed' }, { status: 500 });
  }
}

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getExpiringMemberships } from '@/app/actions/expiry-report';
import { ExpiryReportClient } from '@/components/reports/expiry-report-client';

export const dynamic = 'force-dynamic';

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default async function ExpiryReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: raw } = await searchParams;
  const month = raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) ? raw : currentMonth();
  const rows = await getExpiringMemberships(month);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/reports"
          className="inline-flex min-h-11 items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-[#F4F4F5]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Reports
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-[#F4F4F5]">Membership expirations</h1>
        <p className="mt-0.5 text-xs text-[#A1A1AA]">
          Members whose access ends in the selected month. Reminders are also sent automatically
          10 days before expiry.
        </p>
      </div>
      <ExpiryReportClient month={month} rows={rows} />
    </div>
  );
}

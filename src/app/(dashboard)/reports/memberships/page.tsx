import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getMembershipReport } from '@/app/actions/membership-report';
import { MembershipReportClient } from '@/components/reports/membership-report-client';

export const dynamic = 'force-dynamic';

export default async function MembershipReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const ok = (v?: string) => (v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? `${v}-01` : null);
  const from = ok(sp.from);
  const to = ok(sp.to);
  const { rows, refreshedAt } = await getMembershipReport(from, to);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/reports" className="inline-flex min-h-11 items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-[#F4F4F5]">
          <ArrowLeft className="h-3.5 w-3.5" /> Reports
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-[#F4F4F5]">Membership analysis</h1>
        <p className="mt-0.5 text-xs text-[#A1A1AA]">
          Category-wise sales, collections and discounts from a cached aggregate
          {refreshedAt ? ` · updated ${new Date(refreshedAt).toLocaleString('en-GB')}` : ''}.
        </p>
      </div>
      <MembershipReportClient
        rows={rows}
        from={sp.from && from ? sp.from : ''}
        to={sp.to && to ? sp.to : ''}
      />
    </div>
  );
}

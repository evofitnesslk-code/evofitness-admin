import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { getCurrentUserProfile } from '@/app/actions/auth';
import { getTrainerCommissionSummary } from '@/app/actions/trainer-commissions';
import { isAdminRole } from '@/lib/roles';
import { TrainerReportClient } from '@/components/trainers/trainer-report-client';

export const dynamic = 'force-dynamic';

const ok = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');

export default async function TrainerReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const [sp, { profile }] = await Promise.all([searchParams, getCurrentUserProfile()]);

  if (!isAdminRole(profile?.role)) {
    return (
      <div className="card-luxury mx-auto max-w-md rounded-2xl bg-[#121214] p-10 text-center">
        <ShieldAlert className="mx-auto mb-2 h-8 w-8 text-[#F59E0B]" />
        <p className="text-sm font-semibold text-[#F4F4F5]">Administrators only</p>
        <p className="mt-1 text-xs text-[#A1A1AA]">Trainer commission reports are restricted to admin users.</p>
      </div>
    );
  }

  const from = ok(sp.from);
  const to = ok(sp.to);
  const { rows, error } = await getTrainerCommissionSummary(from || null, to || null);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/reports" className="inline-flex min-h-11 items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-[#F4F4F5]">
          <ArrowLeft className="h-3.5 w-3.5" /> Reports
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-[#F4F4F5]">Trainer commissions</h1>
        <p className="mt-0.5 text-xs text-[#A1A1AA]">
          Members trained, PT revenue, commission earned and payout balance for every trainer.
        </p>
      </div>
      {error ? (
        <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-4 text-xs text-[#EF4444]">
          Could not load the report: {error}
        </div>
      ) : (
        <TrainerReportClient rows={rows} from={from} to={to} />
      )}
    </div>
  );
}

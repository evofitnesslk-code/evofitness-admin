import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { getCurrentUserProfile } from '@/app/actions/auth';
import { getTrainer } from '@/app/actions/trainers';
import {
  getTrainerCommissionLines,
  getTrainerCommissionSummary,
  getTrainerPayouts,
} from '@/app/actions/trainer-commissions';
import { isAdminRole } from '@/lib/roles';
import { TrainerProfileClient } from '@/components/trainers/trainer-profile-client';

export const dynamic = 'force-dynamic';

const ok = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TrainerProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const [{ id }, sp, { profile }] = await Promise.all([params, searchParams, getCurrentUserProfile()]);

  if (!isAdminRole(profile?.role)) {
    return (
      <div className="card-luxury mx-auto max-w-md rounded-2xl bg-[#121214] p-10 text-center">
        <ShieldAlert className="mx-auto mb-2 h-8 w-8 text-[#F59E0B]" />
        <p className="text-sm font-semibold text-[#F4F4F5]">Administrators only</p>
        <p className="mt-1 text-xs text-[#A1A1AA]">Trainer profiles and commissions are restricted to admin users.</p>
      </div>
    );
  }

  if (!UUID.test(id)) notFound();
  const trainer = await getTrainer(id);
  if (!trainer) notFound();

  const from = ok(sp.from);
  const to = ok(sp.to);
  const [{ rows: summaries, error: summaryError }, { rows: lines, error: linesError }, payouts] =
    await Promise.all([
      getTrainerCommissionSummary(from || null, to || null),
      getTrainerCommissionLines(id, from || null, to || null),
      getTrainerPayouts(id),
    ]);
  const summary = summaries.find((s) => s.trainer_id === id) ?? null;
  const error = summaryError ?? linesError;

  return (
    <div className="space-y-6">
      <Link href="/trainers" className="inline-flex min-h-11 items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-[#F4F4F5]">
        <ArrowLeft className="h-3.5 w-3.5" /> Trainers
      </Link>
      {error ? (
        <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-4 text-xs text-[#EF4444]">
          Could not load commission data: {error}
        </div>
      ) : (
        <TrainerProfileClient
          trainer={trainer}
          summary={summary}
          lines={lines}
          payouts={payouts}
          from={from}
          to={to}
        />
      )}
    </div>
  );
}

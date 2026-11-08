import { getMembers } from '@/app/actions/members';
import { getPlans } from '@/app/actions/plans';
import { getTrainers } from '@/app/actions/trainers';
import { getNextInvoiceNumber } from '@/app/actions/memberships';
import { getCurrentUserProfile } from '@/app/actions/auth';
import { NewMembershipWizard } from '@/components/memberships/new-membership-wizard';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Suspense } from 'react';

export default async function NewMembershipPage() {
  const [members, plans, trainers, nextInvoiceNumber, { profile }] =
    await Promise.all([
      getMembers(),
      getPlans(true),
      getTrainers(true),
      getNextInvoiceNumber(),
      getCurrentUserProfile(),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-[#27272A]">
        <Link
          href="/memberships"
          className="p-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-[#F4F4F5] border border-[#27272A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F4F4F5]">
            New Membership Order
          </h1>
          <p className="text-xs text-[#A1A1AA]">
            Select member, package, add-ons, and process initial down payment
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="card-luxury rounded-2xl p-12 text-center bg-[#121214]">
            <div className="w-8 h-8 border-2 border-[#E5B842] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#A1A1AA] mt-3">Loading order wizard...</p>
          </div>
        }
      >
        <NewMembershipWizard
          members={members}
          plans={plans}
          trainers={trainers}
          nextInvoiceNumber={nextInvoiceNumber}
          currentUserProfile={profile}
        />
      </Suspense>
    </div>
  );
}

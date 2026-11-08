import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import type { MembershipPlan } from '@/types/database';
import { PlanGroupList } from '@/components/registrations/pricing-sheet';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Membership Rates | EVO Fitness',
  description:
    'EVO Fitness membership rates in LKR - day pass, one person, couple/buddy and family packages. Balapokuna Road, Colombo 5.',
};

export default async function PricingPage() {
  // Public page: read only the plan fields a visitor may see. Uses the
  // privileged server-side client because visitors have no session.
  const admin = createAdminClient();
  const { data } = await admin
    .from('membership_plans')
    .select('id, name, duration_type, duration_value, target_group, price, description')
    .eq('is_active', true)
    .order('price', { ascending: true });

  const plans = (data || []) as unknown as MembershipPlan[];

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-[#09090B]">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#E5B842]/5 blur-[130px]" />

      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
        <Link
          href="/join"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm text-[#A1A1AA] transition-colors hover:text-[#F4F4F5]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to application
        </Link>

        <header className="mb-8 mt-2 flex flex-col items-center text-center">
          <div className="relative mb-2 h-20 w-40 drop-shadow-[0_8px_16px_rgba(229,184,66,0.15)]">
            <Image
              src="/evofitness-logo.webp"
              alt="EVO Fitness"
              fill
              sizes="160px"
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F4F4F5] sm:text-3xl">
            Membership rates
          </h1>
          <p className="mt-2 max-w-md text-sm text-[#A1A1AA]">
            Prices are in LKR. Personal training is quoted separately at the gym, and all
            memberships are activated at the front desk.
          </p>
        </header>

        <PlanGroupList plans={plans} />

        <p className="mt-10 text-center text-[11px] leading-relaxed text-[#71717A]">
          STRONGER PEOPLE HAPPIER LIVES &bull; FITNESS FOR A BETTER YOU
          <br />
          Balapokuna Road, Colombo 5
        </p>

        <div className="mt-6 flex justify-center">
          <Link
            href="/join"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#E5B842] px-6 text-sm font-semibold text-[#09090B] transition-colors hover:bg-[#F5D061]"
          >
            Start your application
          </Link>
        </div>
      </div>
    </main>
  );
}

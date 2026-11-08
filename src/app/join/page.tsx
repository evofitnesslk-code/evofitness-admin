import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import type { MembershipPlan } from '@/types/database';
import { JoinForm } from './join-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Join EVO Fitness | Membership Application',
  description:
    'Apply for your EVO Fitness membership online. Premium gym, world class equipment and elite trainers - Balapokuna Road, Colombo 5.',
};

export default async function JoinPage() {
  // Public page: read only the plan fields an applicant may see. Uses the
  // privileged server-side client because visitors have no session.
  const admin = createAdminClient();
  const { data } = await admin
    .from('membership_plans')
    .select('id, name, duration_type, duration_value, target_group, price, description')
    .eq('is_active', true)
    .order('duration_value', { ascending: true })
    .order('price', { ascending: true });

  const plans = (data || []) as unknown as MembershipPlan[];

  return (
    <main className="min-h-screen w-full bg-[#09090B] relative overflow-x-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-[#E5B842]/5 blur-[130px] rounded-full pointer-events-none" />

      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 sm:px-6 pt-8 pb-16">
        <header className="flex flex-col items-center text-center mb-8">
          <div className="relative w-40 h-20 mb-2 drop-shadow-[0_8px_16px_rgba(229,184,66,0.15)]">
            <Image
              src="/evofitness-logo.webp"
              alt="EVO Fitness"
              fill
              sizes="160px"
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F4F4F5]">
            Become a Member
          </h1>
          <p className="text-sm text-[#A1A1AA] mt-2 max-w-md">
            Complete this application and our team will contact you to activate your membership.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            {['Premium Gym', 'World Class Equipment', 'Elite Trainers'].map((pillar) => (
              <span
                key={pillar}
                className="px-2.5 py-1 rounded-full bg-[#18181B] border border-[#27272A] text-[11px] text-[#A1A1AA]"
              >
                {pillar}
              </span>
            ))}
          </div>
          <Link
            href="/join/pricing"
            className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#E5B842]/35 px-4 text-[13px] font-medium text-[#F5D061] transition-colors hover:border-[#E5B842]/60"
          >
            View membership rates
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </header>

        <JoinForm plans={plans} />

        <p className="text-center text-[11px] text-[#71717A] mt-10 leading-relaxed">
          STRONGER PEOPLE HAPPIER LIVES &bull; FITNESS FOR A BETTER YOU
          <br />
          Balapokuna Road, Colombo 5
        </p>
      </div>
    </main>
  );
}

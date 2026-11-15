'use client';

import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { MembershipPlan } from '@/types/database';
import { PricingSheet } from '@/components/registrations/pricing-sheet';

/**
 * Header trigger that opens the rates in a dialog. It deliberately does not
 * navigate, so nothing typed into the application form is lost.
 */
export function PricingButton({ plans }: { plans: MembershipPlan[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#E5B842]/35 px-4 text-[13px] font-medium text-[#F5D061] transition-colors hover:border-[#E5B842]/60"
      >
        View membership rates
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
      </button>
      <PricingSheet plans={plans} open={open} onOpenChange={setOpen} />
    </>
  );
}

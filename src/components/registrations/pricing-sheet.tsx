'use client';

import { useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';
import type { MembershipPlan } from '@/types/database';
import { groupPlansForPricing, planDurationLabel } from '@/lib/pricing-groups';
import { cn } from '@/lib/utils';

/**
 * Public pricing surfaces.
 *
 * `PlanGroupList` is presentational and works with or without selection
 * (`onSelect`), so it can be rendered as static cards inside a server
 * component tree when JavaScript is unavailable. `PricingSheet` wraps it in a
 * mobile bottom sheet / desktop dialog with hand-rolled Tailwind only.
 */

interface PlanGroupListProps {
  plans: MembershipPlan[];
  selectedPlanId?: string | null;
  onSelect?: (plan: MembershipPlan) => void;
  compact?: boolean;
}

export function PlanGroupList({ plans, selectedPlanId, onSelect, compact }: PlanGroupListProps) {
  const groups = groupPlansForPricing(plans);

  return (
    <div className={cn('flex flex-col', compact ? 'gap-6' : 'gap-8')}>
      {groups.map((group) => (
        <section key={group.key}>
          <h2 className="text-sm font-semibold text-[#F4F4F5]">{group.title}</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-[#71717A]">{group.subtitle}</p>
          <div className={cn('mt-3 flex flex-col', compact ? 'gap-2.5' : 'gap-3')}>
            {group.plans.map((plan) => {
              const selected = selectedPlanId === plan.id;
              const cardClass = cn(
                'w-full rounded-2xl border text-left transition-colors',
                compact ? 'p-3.5' : 'p-4',
                selected
                  ? 'border-[#E5B842] bg-[#E5B842]/5'
                  : 'border-[#27272A] bg-[#18181B]',
                onSelect ? 'cursor-pointer hover:border-[#3F3F46]' : ''
              );
              const content = (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-[#F4F4F5]">{plan.name}</span>
                    {selected && <Check className="w-4 h-4 shrink-0 text-[#E5B842]" />}
                  </div>
                  <span className="mt-1 block text-[11px] uppercase tracking-wide text-[#A1A1AA]">
                    {planDurationLabel(plan)}
                  </span>
                  <p className="mt-2 text-base font-bold text-[#F5D061]">
                    LKR {Number(plan.price).toLocaleString()}
                  </p>
                  {plan.description && (
                    <p className="mt-1 text-[11px] text-[#71717A]">{plan.description}</p>
                  )}
                </>
              );

              return onSelect ? (
                <button
                  key={plan.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(plan)}
                  className={cardClass}
                >
                  {content}
                </button>
              ) : (
                <div key={plan.id} className={cardClass}>
                  {content}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

interface PricingSheetProps {
  plans: MembershipPlan[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlanId?: string | null;
  onSelect?: (plan: MembershipPlan) => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function PricingSheet({
  plans,
  open,
  onOpenChange,
  selectedPlanId,
  onSelect,
}: PricingSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const onOpenChangeRef = useRef(onOpenChange);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;

    triggerRef.current = (document.activeElement as HTMLElement) ?? null;
    const focusFrame = window.setTimeout(() => panelRef.current?.focus(), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onOpenChangeRef.current(false);
        return;
      }
      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.clearTimeout(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus?.();
    };
  }, [open]);

  return (
    <div
      data-state={open ? 'open' : 'closed'}
      inert={!open}
      className={cn(
        'group fixed inset-0 z-50 flex items-end justify-center sm:items-center',
        !open && 'pointer-events-none'
      )}
    >
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 cursor-default bg-black/60 opacity-100 transition-opacity duration-300 motion-reduce:transition-none group-data-[state=closed]:opacity-0"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Membership rates"
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[85vh] w-full flex-col overflow-hidden border border-[#27272A] bg-[#121214] outline-none',
          'rounded-t-3xl sm:max-w-lg sm:rounded-3xl',
          'translate-y-0 opacity-100 transition-[transform,opacity] duration-300',
          '[transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none',
          'group-data-[state=closed]:translate-y-full group-data-[state=closed]:opacity-0',
          'sm:group-data-[state=closed]:translate-y-0 sm:group-data-[state=closed]:scale-95'
        )}
      >
        <div className="sticky top-0 z-10 flex shrink-0 items-start justify-between gap-3 border-b border-[#27272A] bg-[#121214] px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-[#F4F4F5]">Membership rates</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-[#71717A]">
              Prices are in LKR. Personal training is quoted separately at the gym, and all
              memberships are activated at the front desk.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#A1A1AA] transition-colors hover:bg-[#18181B] hover:text-[#F4F4F5]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8 pt-5 sm:px-6">
          <PlanGroupList
            plans={plans}
            selectedPlanId={selectedPlanId}
            onSelect={onSelect}
            compact
          />
        </div>
      </div>
    </div>
  );
}

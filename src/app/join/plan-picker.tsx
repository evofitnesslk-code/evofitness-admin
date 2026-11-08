'use client';

import { useMemo } from 'react';
import { ArrowUpRight, Check, ListFilter, Tag } from 'lucide-react';
import type { ApplicationKind, Gender, MembershipPlan } from '@/types/database';
import { planMatchesApplication, planPairingNote } from '@/lib/registration-options';
import { planDurationLabel } from '@/lib/pricing-groups';
import { cn, formatLKR } from '@/lib/utils';
import { InfoNote } from './fields';

/**
 * Membership step: the plan cards that fit this application.
 *
 * Plans are filtered by how many people are joining and by those people's
 * genders, so a couple never sees a gents-only annual and two men never see the
 * couple package. Because that filtering depends on the genders entered in the
 * earlier steps, the genders stay editable right here.
 */

export interface PlanPickerProps {
  plans: MembershipPlan[];
  kind: ApplicationKind;
  genders: ReadonlyArray<Gender | ''>;
  selectedPlanId: string;
  onSelect: (planId: string) => void;
  onGenderChange: (personIndex: number, gender: Gender) => void;
  onOpenPricing: () => void;
}

export function PlanPicker({
  plans,
  kind,
  genders,
  selectedPlanId,
  onSelect,
  onGenderChange,
  onOpenPricing,
}: PlanPickerProps) {
  const matching = useMemo(
    () =>
      plans
        .filter((plan) => planMatchesApplication(plan.target_group ?? '', kind, genders))
        .sort((a, b) => Number(a.price) - Number(b.price)),
    [plans, kind, genders]
  );

  const twoPeople = kind === 'buddy' || kind === 'family';
  const selected = matching.find((plan) => plan.id === selectedPlanId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onOpenPricing}
        className="flex items-center justify-between gap-3 rounded-2xl border border-[#E5B842]/35 bg-[#121214] p-4 text-left transition-colors hover:border-[#E5B842]/60"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5B842]/40 bg-[#E5B842]/12 text-[#F5D061]">
            <Tag className="h-4 w-4" aria-hidden />
          </span>
          <span>
            <span className="block text-[14.5px] font-semibold tracking-tight text-[#F4F4F5]">
              Full membership rates
            </span>
            <span className="block text-[12.5px] text-[#71717A]">
              Every plan and price, in LKR
            </span>
          </span>
        </span>
        <span className="flex items-center gap-1 text-[12.5px] font-medium text-[#F5D061]">
          View
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </button>

      {twoPeople ? (
        <div className="rounded-2xl border border-[#27272A] bg-[#121214] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[14px] font-semibold tracking-tight text-[#F4F4F5]">
                Genders on this membership
              </h3>
              <p className="mt-1 text-[12.5px] leading-snug text-[#71717A]">
                Two gents or two ladies open the buddy packages; a mixed pair opens the couple
                package. Tap to correct.
              </p>
            </div>
            <ListFilter className="mt-0.5 h-4 w-4 shrink-0 text-[#52525B]" aria-hidden />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {genders.map((gender, personIndex) => (
              <div
                key={personIndex}
                className="flex items-center gap-1.5 rounded-full border border-[#27272A] bg-[#09090B] p-1 pl-3"
              >
                <span className="text-[12px] text-[#A1A1AA]">
                  {personIndex === 0 ? 'Person 1' : `Person ${personIndex + 1}`}
                </span>
                {(['male', 'female'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={gender === option}
                    onClick={() => onGenderChange(personIndex, option)}
                    className={cn(
                      'min-h-9 rounded-full px-3 text-[12px] font-medium capitalize transition-colors',
                      gender === option
                        ? 'bg-[#E5B842]/15 text-[#F5D061]'
                        : 'text-[#71717A] hover:text-[#D4D4D8]'
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {matching.length === 0 ? (
        <InfoNote>
          No plan matches this combination right now. Adjust the genders above, or open the full
          rates and our team will sort it out with you.
        </InfoNote>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {matching.map((plan) => {
            const isSelected = plan.id === selectedPlanId;
            const note = planPairingNote(plan.target_group ?? '', kind, genders);
            return (
              <li key={plan.id}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(isSelected ? '' : plan.id)}
                  className={cn(
                    'w-full rounded-2xl border p-4 text-left transition-[background-color,border-color,transform] duration-150 active:scale-[0.99]',
                    isSelected
                      ? 'border-[#E5B842]/60 bg-[#E5B842]/8'
                      : 'border-[#27272A] bg-[#121214] hover:border-[#3F3F46]'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold tracking-tight text-[#F4F4F5]">
                        {plan.name}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-[#A1A1AA]">
                        {planDurationLabel(plan)}
                      </p>
                      {plan.description ? (
                        <p className="mt-1.5 text-[12.5px] leading-snug text-[#71717A]">
                          {plan.description}
                        </p>
                      ) : null}
                      {note ? (
                        <p className="mt-1.5 text-[12px] text-[#A1A1AA]">{note}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="text-[15px] font-bold tabular-nums text-[#F5D061]">
                        {formatLKR(Number(plan.price))}
                      </span>
                      <span
                        aria-hidden
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full border',
                          isSelected
                            ? 'border-[#E5B842] bg-[#E5B842] text-[#09090B]'
                            : 'border-[#3F3F46]'
                        )}
                      >
                        {isSelected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {selectedPlanId ? (
          <button
            type="button"
            onClick={() => onSelect('')}
            className="min-h-11 rounded-full border border-[#27272A] bg-[#121214] px-4 text-[13px] text-[#A1A1AA] transition-colors hover:border-[#3F3F46] hover:text-[#D4D4D8]"
          >
            Clear selection
          </button>
        ) : null}
        <p className="text-[12px] text-[#71717A]">
          Selecting a plan is optional — our team confirms the final plan with you
          {selected ? ` (${selected.name})` : ''}.
        </p>
      </div>
    </div>
  );
}

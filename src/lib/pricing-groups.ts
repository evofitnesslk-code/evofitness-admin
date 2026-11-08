import type { MembershipPlan } from '@/types/database';

/**
 * Pure grouping/formatting helpers for the public "Membership rates" page and
 * the pricing bottom sheet.
 *
 * Every active plan must land in exactly one section. The classification is
 * derived from the plan data itself (`duration_type` and `target_group`) and
 * never from hard-coded plan ids or names, so it keeps working when the gym
 * adds a new two-person or family package.
 */

export interface PricingGroup {
  key: string;
  title: string;
  subtitle: string;
  plans: MembershipPlan[];
}

/** Lower-cased markers that identify a two-person package. */
const TWO_PERSON_MARKERS = ['couple', 'buddy', '2 person', 'two person', 'twin'];

/**
 * Which one section a plan belongs to. A day pass is sold by duration (`days`)
 * rather than membership term; a family package wins over a two-person package
 * because its `target_group` mentions family; everything else is a
 * single-person membership (General / Gents / Ladies).
 */
function classifyPlan(plan: MembershipPlan): string {
  const group = (plan.target_group || '').toLowerCase();
  if (plan.duration_type === 'days') return 'day-pass';
  if (group.includes('family')) return 'family';
  if (TWO_PERSON_MARKERS.some((marker) => group.includes(marker))) return 'two-people';
  return 'one-person';
}

const GROUP_DEFINITIONS: ReadonlyArray<{ key: string; title: string; subtitle: string }> = [
  {
    key: 'day-pass',
    title: 'Day pass',
    subtitle: 'A single visit with no membership commitment.',
  },
  {
    key: 'one-person',
    title: 'One person',
    subtitle: 'One person on one monthly, six month or annual membership.',
  },
  {
    key: 'two-people',
    title: 'Two people',
    subtitle:
      'One membership for two people. The Couple package is for a mixed-gender pair; the buddy packages are for two gents or two ladies.',
  },
  {
    key: 'family',
    title: 'Family',
    subtitle: 'Three to six people on one membership.',
  },
];

/**
 * Group every plan into exactly one section, dropping sections that end up
 * empty. Plans inside a section are sorted by price ascending.
 */
export function groupPlansForPricing(plans: MembershipPlan[]): PricingGroup[] {
  return GROUP_DEFINITIONS.map((definition) => ({
    ...definition,
    plans: plans
      .filter((plan) => classifyPlan(plan) === definition.key)
      .sort((a, b) => Number(a.price) - Number(b.price)),
  })).filter((group) => group.plans.length > 0);
}

/**
 * Human duration label: `1 Day`, `1 Month`, `6 Months`, `12 Months`.
 */
export function planDurationLabel(plan: MembershipPlan): string {
  const value = Number(plan.duration_value) || 1;
  if (plan.duration_type === 'days') {
    return `${value} ${value === 1 ? 'Day' : 'Days'}`;
  }
  return `${value} ${value === 1 ? 'Month' : 'Months'}`;
}

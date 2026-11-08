import type { ApplicationKind, Gender } from '@/types/database';

/**
 * Shared option catalogue for the public member registration form.
 * Values intentionally match the historical Google Form responses so existing
 * records stay comparable (see `form.html` in the project root).
 */

export const PARQ_QUESTIONS = [
  {
    key: 'heart_condition',
    label:
      'Has your doctor ever said that you have a heart condition and that you should only do physical activity recommended by a doctor?',
  },
  {
    key: 'chest_pain_activity',
    label: 'Do you feel pain in your chest when you do physical activity?',
  },
  {
    key: 'chest_pain_rest',
    label: 'In the past month, have you had chest pain when you were not doing physical activity?',
  },
  {
    key: 'dizziness_balance',
    label: 'Do you lose your balance because of dizziness or do you ever lose consciousness?',
  },
  {
    key: 'bone_joint_problem',
    label:
      'Do you have a bone or joint problem that could be made worse by a change in your physical activity?',
  },
  {
    key: 'bp_medication',
    label: 'Is your doctor currently prescribing drugs for your blood pressure or heart condition?',
  },
  {
    key: 'other_reason',
    label: 'Do you know of any other reason you should not do physical activity?',
  },
] as const;

export type ParqKey = (typeof PARQ_QUESTIONS)[number]['key'];

export const AGREEMENTS = [
  {
    key: 'release_of_liability',
    label: 'I have read and understood the Release of Liability and Conditions.',
  },
  {
    key: 'rules_regulations',
    label: 'I agree to comply with all rules and regulations.',
  },
  {
    key: 'no_refund',
    label: 'I understand that I will not be entitled to a refund under any circumstances.',
  },
  {
    key: 'data_consent',
    label: 'I consent to my personal data being collected and stored by EVO Fitness.',
  },
  {
    key: 'information_accurate',
    label: 'I confirm that the information provided in this application is accurate and complete.',
  },
] as const;

export type AgreementKey = (typeof AGREEMENTS)[number]['key'];

export const MEMBER_DECLARATION =
  'I have read and understood the above Conditions and I Agree.';

export const REASONS_FOR_JOINING = [
  'Fitness',
  'Endurance',
  'Strength & Size',
  'Muscle & Power',
  'Toning & Weight Loss',
] as const;

export const REFERRAL_SOURCES = [
  'Friend',
  'Existing Member',
  'Facebook',
  'Instagram',
  'Website',
  'Leaflet',
  'Newspaper',
] as const;

export const CIVIL_STATUSES = ['Single', 'Married', 'Other'] as const;

/**
 * Plans are shown to applicants only when the plan's target group is
 * compatible with the gender they selected. General, Couple, Family and Day
 * Pass plans stay visible for everyone; Gents/Ladies plans are filtered.
 */
export function planMatchesGender(targetGroup: string, gender: Gender | ''): boolean {
  const group = (targetGroup || '').toLowerCase();
  if (!gender) return true;
  if (group.includes('ladies')) return gender === 'female';
  if (group.includes('gents')) return gender === 'male';
  return true;
}

export function planGenderNote(targetGroup: string): string | null {
  const group = (targetGroup || '').toLowerCase();
  if (group.includes('ladies')) return 'Ladies only';
  if (group.includes('gents')) return 'Gents only';
  if (group.includes('couple')) return 'Couple membership';
  if (group.includes('family')) return 'Family membership';
  return null;
}

/** How many people an application can cover. */
export const MAX_PARTY_SIZE: Record<ApplicationKind, number> = {
  individual: 1,
  buddy: 2,
  family: 6,
};

export const MIN_PARTY_SIZE: Record<ApplicationKind, number> = {
  individual: 1,
  buddy: 2,
  family: 3,
};

export const APPLICATION_KINDS: ReadonlyArray<{
  value: ApplicationKind;
  label: string;
  summary: string;
  detail: string;
}> = [
  {
    value: 'individual',
    label: 'Individual',
    summary: 'Just me',
    detail: 'One person on one membership',
  },
  {
    value: 'buddy',
    label: 'Couple / Buddy',
    summary: 'Me + 1',
    detail: 'Two people on one membership - couple or two-person package',
  },
  {
    value: 'family',
    label: 'Family',
    summary: '3 to 6 people',
    detail: 'A family on one membership',
  },
];

export function applicationKindLabel(kind: ApplicationKind): string {
  return APPLICATION_KINDS.find((option) => option.value === kind)?.label ?? 'Individual';
}

/** Sentence used on the review screen: "Individual - one person on one membership". */
export function applicationKindSummary(kind: ApplicationKind): string {
  const option = APPLICATION_KINDS.find((item) => item.value === kind);
  return option ? `${option.label} - ${option.detail.toLowerCase()}` : 'Individual';
}

/**
 * Which plans an application can pick from.
 *
 * The number of people decides the shape (one person cannot buy a couple
 * package, two people on one membership need a two-person package), and the
 * genders of everyone on the application decide which two-person package
 * applies: two men get the gents buddy/annual package, two ladies the ladies
 * package, and a mixed pair the couple package.
 */
export function planMatchesApplication(
  targetGroup: string,
  kind: ApplicationKind,
  genders: ReadonlyArray<Gender | ''>
): boolean {
  const group = (targetGroup || '').toLowerCase();
  const sameGents = genders.length === 2 && genders.every((gender) => gender === 'male');
  const sameLadies = genders.length === 2 && genders.every((gender) => gender === 'female');

  if (kind === 'family') return group.includes('family');
  if (group.includes('family')) return false;

  if (kind === 'buddy') {
    if (group.includes('couple')) return !sameGents && !sameLadies;
    if (group.includes('gents')) return sameGents;
    if (group.includes('ladies')) return sameLadies;
    return false;
  }

  // Individual: two-person and family packages are out.
  const twoPerson =
    group.includes('couple') ||
    group.includes('buddy') ||
    group.includes('2 person') ||
    group.includes('two person') ||
    group.includes('twin');
  if (twoPerson) return false;
  if (group.includes('ladies')) return genders[0] === 'female';
  if (group.includes('gents')) return genders[0] === 'male';
  return true;
}

/**
 * Note shown on a two-person plan card when the pairing is unusual (for
 * example two men looking at the couple package because they picked the wrong
 * genders for each other).
 */
export function planPairingNote(
  targetGroup: string,
  kind: ApplicationKind,
  _genders: ReadonlyArray<Gender | ''>
): string | null {
  void _genders;
  if (kind !== 'buddy') return planGenderNote(targetGroup);
  const group = (targetGroup || '').toLowerCase();
  if (group.includes('couple')) return 'Both names on one membership';
  if (group.includes('gents')) return 'Two gents';
  if (group.includes('ladies')) return 'Two ladies';
  return null;
}

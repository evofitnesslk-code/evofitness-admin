import type { CountryCode } from 'libphonenumber-js';
import type { ApplicationKind, Gender } from '@/types/database';
import type { RegistrationPersonPayload, RegistrationSubmission } from '@/app/actions/registrations';
import { parsePhone, DEFAULT_PHONE_COUNTRY } from '@/lib/phone';
import { AGREEMENTS, MAX_PARTY_SIZE, PARQ_QUESTIONS } from '@/lib/registration-options';

/**
 * Client-side state, step plan and validation for the public application form.
 *
 * One application covers one person (individual), two people (buddy) or three
 * to six people (family). `people[0]` is the primary applicant - their record
 * carries the household's shared emergency contact and the office details.
 */

export interface PersonState {
  first_name: string;
  last_name: string;
  gender: '' | Gender;
  /** `YYYY-MM-DD`, empty until picked. */
  date_of_birth: string;
  nic_passport: string;
  civil_status: string;
  profession: string;
  /** National number as typed; `phone_country` completes it. */
  phone: string;
  phone_country: CountryCode;
  email: string;
  office_address: string;
  office_city: string;
  office_post_code: string;
  office_land_phone: string;
  office_mobile: string;
  parq_answers: Record<string, boolean>;
  parq_details: string;
  weight_kg: string;
  height_cm: string;
  fat_percentage: string;
}

export interface FormState {
  kind: '' | ApplicationKind;
  people: PersonState[];
  residence: string;
  city: string;
  post_code: string;
  land_phone: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;
  emergency_contact_country: CountryCode;
  emergency_contact_land_phone: string;
  reasons_for_joining: string[];
  how_did_you_hear: string[];
  preferred_plan_id: string;
  agreements: Record<string, boolean>;
  member_declaration: boolean;
  honeypot: string;
}

export function createPersonState(): PersonState {
  return {
    first_name: '',
    last_name: '',
    gender: '',
    date_of_birth: '',
    nic_passport: '',
    civil_status: '',
    profession: '',
    phone: '',
    phone_country: DEFAULT_PHONE_COUNTRY,
    email: '',
    office_address: '',
    office_city: '',
    office_post_code: '',
    office_land_phone: '',
    office_mobile: '',
    parq_answers: {},
    parq_details: '',
    weight_kg: '',
    height_cm: '',
    fat_percentage: '',
  };
}

export function createInitialFormState(): FormState {
  return {
    kind: '',
    people: [createPersonState()],
    residence: '',
    city: '',
    post_code: '',
    land_phone: '',
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_phone: '',
    emergency_contact_country: DEFAULT_PHONE_COUNTRY,
    emergency_contact_land_phone: '',
    reasons_for_joining: [],
    how_did_you_hear: [],
    preferred_plan_id: '',
    agreements: {},
    member_declaration: false,
    honeypot: '',
  };
}

export interface FormStep {
  key: 'kind' | 'person' | 'home' | 'membership' | 'review';
  /** Index into `people` for `person` steps, -1 otherwise. */
  personIndex: number;
  title: string;
  subtitle: string;
}

export function buildSteps(form: FormState): FormStep[] {
  const steps: FormStep[] = [
    {
      key: 'kind',
      personIndex: -1,
      title: "Who's joining?",
      subtitle: 'One person, two people, or the whole family on a single membership.',
    },
  ];

  form.people.forEach((person, index) => {
    const name = `${person.first_name} ${person.last_name}`.trim();
    steps.push({
      key: 'person',
      personIndex: index,
      title: index === 0 ? 'Your details' : `Person ${index + 1}`,
      subtitle:
        index === 0
          ? 'Your identity, contact number and health screening.'
          : name
            ? `Identity, contact number and health screening for ${name}.`
            : `Identity, contact number and health screening for person ${index + 1}.`,
    });
  });

  steps.push(
    {
      key: 'home',
      personIndex: -1,
      title: 'Home & emergency',
      subtitle: 'Where you live, and who we contact if anything happens.',
    },
    {
      key: 'membership',
      personIndex: -1,
      title: 'Membership',
      subtitle: 'Pick the membership you are interested in. Our team confirms it with you.',
    },
    {
      key: 'review',
      personIndex: -1,
      title: 'Review & consent',
      subtitle: 'Check everything, then accept the conditions.',
    }
  );

  return steps;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const MIN_AGE = 8;
const MAX_AGE = 110;

export function ageFromDob(dob: string): number | null {
  if (!dob) return null;
  const date = new Date(`${dob}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - date.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - date.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < date.getUTCDate())) age -= 1;
  return age;
}

function validateMeasurements(person: PersonState, prefix: string): Record<string, string> {
  const errors: Record<string, string> = {};
  const checks: Array<[keyof PersonState, number, number, string]> = [
    ['weight_kg', 20, 400, 'Weight should be between 20 and 400 kg.'],
    ['height_cm', 80, 250, 'Height should be between 80 and 250 cm.'],
    ['fat_percentage', 0, 70, 'Body fat should be between 0 and 70%.'],
  ];
  for (const [field, min, max, message] of checks) {
    const raw = String(person[field] ?? '').trim();
    if (!raw) continue;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
      errors[`${prefix}${field}`] = message;
    }
  }
  return errors;
}

export function validatePerson(person: PersonState, index: number): Record<string, string> {
  const prefix = `p${index}.`;
  const errors: Record<string, string> = {};
  const isPrimary = index === 0;

  if (!person.first_name.trim()) errors[`${prefix}first_name`] = 'First name is required.';
  if (!person.last_name.trim()) errors[`${prefix}last_name`] = 'Last name is required.';
  if (!person.gender) errors[`${prefix}gender`] = 'Please select a gender.';

  if (person.date_of_birth) {
    const age = ageFromDob(person.date_of_birth);
    if (age === null || age < MIN_AGE || age > MAX_AGE) {
      errors[`${prefix}date_of_birth`] = 'Please enter a valid date of birth.';
    }
  } else if (isPrimary) {
    errors[`${prefix}date_of_birth`] = 'Please enter your date of birth.';
  }

  const phone = parsePhone(person.phone, person.phone_country);
  if (!person.phone.trim()) {
    if (isPrimary) errors[`${prefix}phone`] = 'A mobile number is required.';
  } else if (!phone.valid) {
    errors[`${prefix}phone`] = 'Please enter a valid mobile number.';
  }

  const email = person.email.trim();
  if (email && !EMAIL_PATTERN.test(email)) {
    errors[`${prefix}email`] = 'Please enter a valid email address.';
  }

  for (const question of PARQ_QUESTIONS) {
    if (typeof person.parq_answers[question.key] !== 'boolean') {
      errors[`${prefix}parq`] = 'Please answer every health screening question.';
      break;
    }
  }
  if (
    !errors[`${prefix}parq`] &&
    Object.values(person.parq_answers).some(Boolean) &&
    !person.parq_details.trim()
  ) {
    errors[`${prefix}parq_details`] = 'Please describe the questions you answered YES to.';
  }

  return { ...errors, ...validateMeasurements(person, prefix) };
}

export function validateHome(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.residence.trim()) errors.residence = 'Residence is required.';
  if (!form.city.trim()) errors.city = 'City is required.';
  if (!form.emergency_contact_name.trim()) {
    errors.emergency_contact_name = 'Emergency contact name is required.';
  }
  if (!form.emergency_contact_relationship.trim()) {
    errors.emergency_contact_relationship = 'Relationship is required.';
  }
  if (!form.emergency_contact_phone.trim()) {
    errors.emergency_contact_phone = 'Emergency contact mobile is required.';
  } else if (!parsePhone(form.emergency_contact_phone, form.emergency_contact_country).valid) {
    errors.emergency_contact_phone = 'Please enter a valid mobile number.';
  }
  return errors;
}

export function validateConsent(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const agreement of AGREEMENTS) {
    if (form.agreements[agreement.key] !== true) {
      errors.agreements = 'All conditions and agreements must be accepted.';
      break;
    }
  }
  if (!form.member_declaration) {
    errors.member_declaration = 'Please accept the member declaration.';
  }
  return errors;
}

export function validateStep(step: FormStep, form: FormState): Record<string, string> {
  if (step.key === 'kind') {
    if (!form.kind) return { kind: 'Please choose who is joining.' };
    const size = form.people.length;
    if (form.kind === 'individual' && size !== 1) {
      return { kind: 'An individual application covers one person.' };
    }
    if (form.kind === 'buddy' && size !== 2) {
      return { kind: 'A couple or buddy application needs two people.' };
    }
    if (form.kind === 'family' && (size < 3 || size > MAX_PARTY_SIZE.family)) {
      return { kind: 'A family application covers 3 to 6 people.' };
    }
    return {};
  }
  if (step.key === 'person') return validatePerson(form.people[step.personIndex], step.personIndex);
  if (step.key === 'home') return validateHome(form);
  if (step.key === 'review') return validateConsent(form);
  return {};
}

export function validateApplication(form: FormState): {
  errors: Record<string, string>;
  firstInvalidStep: number;
} {
  const steps = buildSteps(form);
  const errors: Record<string, string> = {};
  let firstInvalidStep = -1;

  steps.forEach((step, index) => {
    const stepErrors = validateStep(step, form);
    if (Object.keys(stepErrors).length > 0) {
      Object.assign(errors, stepErrors);
      if (firstInvalidStep === -1) firstInvalidStep = index;
    }
  });

  return { errors, firstInvalidStep };
}

function toNumber(value: string): number | null {
  const raw = value.trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPersonPayload(person: PersonState, includeOffice: boolean): RegistrationPersonPayload {
  return {
    first_name: person.first_name,
    last_name: person.last_name,
    gender: person.gender,
    date_of_birth: person.date_of_birth || null,
    nic_passport: person.nic_passport || null,
    civil_status: person.civil_status || null,
    profession: person.profession || null,
    phone: parsePhone(person.phone, person.phone_country).e164,
    email: person.email.trim() || null,
    ...(includeOffice
      ? {
          office_address: person.office_address || null,
          office_city: person.office_city || null,
          office_post_code: person.office_post_code || null,
          office_land_phone: person.office_land_phone || null,
          office_mobile: person.office_mobile || null,
        }
      : {}),
    parq_answers: person.parq_answers,
    parq_details: person.parq_details || null,
    weight_kg: toNumber(person.weight_kg),
    height_cm: toNumber(person.height_cm),
    fat_percentage: toNumber(person.fat_percentage),
  };
}

/** Client state -> the payload the server action validates and stores. */
export function toSubmission(form: FormState): RegistrationSubmission {
  const [primary, ...additional] = form.people;
  return {
    application_kind: form.kind || 'individual',
    primary: toPersonPayload(primary, true),
    additional: additional.map((person) => toPersonPayload(person, false)),
    residence: form.residence || undefined,
    city: form.city || undefined,
    post_code: form.post_code || undefined,
    land_phone: form.land_phone || undefined,
    emergency_contact_name: form.emergency_contact_name,
    emergency_contact_relationship: form.emergency_contact_relationship,
    emergency_contact_phone:
      parsePhone(form.emergency_contact_phone, form.emergency_contact_country).e164 ||
      form.emergency_contact_phone,
    emergency_contact_land_phone: form.emergency_contact_land_phone || undefined,
    reasons_for_joining: form.reasons_for_joining,
    how_did_you_hear: form.how_did_you_hear,
    preferred_plan_id: form.preferred_plan_id || null,
    agreements: form.agreements,
    member_declaration: form.member_declaration,
    honeypot: form.honeypot,
  };
}

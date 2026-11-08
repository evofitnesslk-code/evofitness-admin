'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatEmailError, sendEmail } from '@/lib/email/resend';
import {
  buildAdminRegistrationAlert,
  buildApplicantAcknowledgement,
} from '@/lib/email/registration-emails';
import { phoneMatchKey } from '@/lib/phone';
import {
  AGREEMENTS,
  APPLICATION_KINDS,
  MAX_PARTY_SIZE,
  MIN_PARTY_SIZE,
  PARQ_QUESTIONS,
} from '@/lib/registration-options';
import type {
  MemberRegistration,
  MemberRegistrationApplicant,
  RegistrationStatus,
} from '@/types/database';

/* -------------------------------------------------------------------------- */
/* Public submission                                                          */
/* -------------------------------------------------------------------------- */

/**
 * One person on an application.
 *
 * An application covers one person (`individual`), two people (`buddy`) or
 * three to six people (`family`). The primary person carries the office
 * details and the required contact number; every additional person carries
 * their own identity, optional contact and their own PAR-Q answers.
 */
export interface RegistrationPersonPayload {
  first_name: string;
  last_name: string;
  gender: string;
  date_of_birth?: string | null;
  nic_passport?: string | null;
  civil_status?: string | null;
  profession?: string | null;
  /** E.164, e.g. `+94771234567`. Required for the primary person. */
  phone?: string | null;
  email?: string | null;
  /** Office details are collected for the primary person only. */
  office_address?: string | null;
  office_city?: string | null;
  office_post_code?: string | null;
  office_land_phone?: string | null;
  office_mobile?: string | null;
  parq_answers?: Record<string, boolean>;
  parq_details?: string | null;
  weight_kg?: string | number | null;
  height_cm?: string | number | null;
  fat_percentage?: string | number | null;
}

export interface RegistrationSubmission {
  /** `individual` (1 person) | `buddy` (2 people) | `family` (3-6 people). */
  application_kind: string;
  primary: RegistrationPersonPayload;
  /** People 2..n in order; empty for an individual application. */
  additional?: RegistrationPersonPayload[];

  // Shared household details
  residence?: string;
  city?: string;
  post_code?: string;
  land_phone?: string;

  // Shared emergency contact
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;
  emergency_contact_land_phone?: string;

  reasons_for_joining?: string[];
  how_did_you_hear?: string[];
  preferred_plan_id?: string | null;
  agreements?: Record<string, boolean>;
  member_declaration?: boolean;
  /** Hidden anti-spam field - must stay empty. */
  honeypot?: string;
}

export type SubmitRegistrationResult =
  | { success: true; reference: string }
  | { error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
/** Applicant mobile numbers are stored in E.164 (`+94771234567`). */
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;
/** Phone numbers that are only passed through (emergency contact, land lines). */
const PHONE_PATTERN = /^[+()\-\s\d]{7,25}$/;
const GENDERS = ['male', 'female', 'other'] as const;

function cleanText(value: unknown, maxLength = 200): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function parseOptionalNumber(
  value: unknown,
  bounds: { min: number; max: number; integer?: boolean }
): { ok: true; value: number | null } | { ok: false } {
  const raw = typeof value === 'string' ? value.trim() : value;
  if (raw === null || raw === undefined || raw === '') return { ok: true, value: null };
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return { ok: false };
  if (bounds.integer && !Number.isInteger(parsed)) return { ok: false };
  if (parsed < bounds.min || parsed > bounds.max) return { ok: false };
  return { ok: true, value: parsed };
}

/**
 * Real `YYYY-MM-DD` date with an age between 8 and 110. Returns the value back
 * when valid, `null` otherwise (so 2026-02-31 and future dates are rejected).
 */
function parseDateOfBirth(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  const now = new Date();
  let age = now.getUTCFullYear() - year;
  const monthDiff = now.getUTCMonth() - (month - 1);
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < day)) age -= 1;
  if (age < 8 || age > 110) return null;
  return value;
}

/** A person after every field has been cleaned, bounded and re-validated. */
interface ValidatedPerson {
  first_name: string;
  last_name: string;
  full_name: string;
  gender: 'male' | 'female' | 'other';
  date_of_birth: string | null;
  nic_passport: string | null;
  civil_status: string | null;
  profession: string | null;
  phone: string | null;
  email: string | null;
  office_address: string | null;
  office_city: string | null;
  office_post_code: string | null;
  office_land_phone: string | null;
  office_mobile: string | null;
  parq_answers: Record<string, boolean>;
  parq_has_condition: boolean;
  parq_details: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  fat_percentage: number | null;
}

/**
 * Validates one person on an application. The browser is never trusted: every
 * rule is re-applied here regardless of what the form already checked.
 */
function validatePerson(
  raw: RegistrationPersonPayload | undefined,
  options: { requirePhone: boolean; requireDob: boolean; label: string }
): { ok: true; person: ValidatedPerson } | { ok: false; error: string } {
  const who = options.label;
  if (!raw) return { ok: false, error: `${who}: details are missing.` };

  const firstName = cleanText(raw.first_name, 80);
  const lastName = cleanText(raw.last_name, 80);
  if (!firstName || !lastName) {
    return { ok: false, error: `${who}: first and last name are required.` };
  }

  const gender = cleanText(raw.gender, 20);
  if (!gender || !(GENDERS as readonly string[]).includes(gender)) {
    return { ok: false, error: `${who}: please select a gender.` };
  }

  const phone = cleanText(raw.phone, 25);
  if (options.requirePhone) {
    if (!phone || !E164_PATTERN.test(phone)) {
      return { ok: false, error: `${who}: a valid mobile number is required.` };
    }
  } else if (phone && !E164_PATTERN.test(phone)) {
    return { ok: false, error: `${who}: please enter a valid mobile number.` };
  }

  const email = cleanText(raw.email, 160)?.toLowerCase() || null;
  if (email && !EMAIL_PATTERN.test(email)) {
    return { ok: false, error: `${who}: please enter a valid email address.` };
  }

  let dateOfBirth: string | null = null;
  const rawDob = cleanText(raw.date_of_birth, 10);
  if (rawDob) {
    dateOfBirth = parseDateOfBirth(rawDob);
    if (!dateOfBirth) {
      return { ok: false, error: `${who}: please enter a valid date of birth.` };
    }
  } else if (options.requireDob) {
    return { ok: false, error: `${who}: date of birth is required.` };
  }

  const weight = parseOptionalNumber(raw.weight_kg, { min: 20, max: 400 });
  const height = parseOptionalNumber(raw.height_cm, { min: 80, max: 250 });
  const fat = parseOptionalNumber(raw.fat_percentage, { min: 0, max: 70 });
  if (!weight.ok || !height.ok || !fat.ok) {
    return {
      ok: false,
      error: `${who}: please check the weight, height and body fat values you entered.`,
    };
  }

  const parqAnswers: Record<string, boolean> = {};
  for (const question of PARQ_QUESTIONS) {
    const answer = raw.parq_answers?.[question.key];
    if (typeof answer !== 'boolean') {
      return { ok: false, error: `${who}: please answer every health screening question.` };
    }
    parqAnswers[question.key] = answer;
  }
  const parqHasCondition = Object.values(parqAnswers).some(Boolean);
  const parqDetails = cleanText(raw.parq_details, 1000);
  if (parqHasCondition && !parqDetails) {
    return {
      ok: false,
      error: `${who}: please describe the health conditions you flagged.`,
    };
  }

  return {
    ok: true,
    person: {
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      gender: gender as 'male' | 'female' | 'other',
      date_of_birth: dateOfBirth,
      nic_passport: cleanText(raw.nic_passport, 40),
      civil_status: cleanText(raw.civil_status, 30),
      profession: cleanText(raw.profession, 120),
      phone,
      email,
      office_address: cleanText(raw.office_address, 200),
      office_city: cleanText(raw.office_city, 80),
      office_post_code: cleanText(raw.office_post_code, 12),
      office_land_phone: cleanText(raw.office_land_phone, 25),
      office_mobile: cleanText(raw.office_mobile, 25),
      parq_answers: parqAnswers,
      parq_has_condition: parqHasCondition,
      parq_details: parqDetails,
      weight_kg: weight.value,
      height_cm: height.value,
      fat_percentage: fat.value,
    },
  };
}

async function resolveAppUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, '');

  const headerList = await headers();
  const host = headerList.get('x-forwarded-host') || headerList.get('host') || 'evofitness.site';
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const proto = headerList.get('x-forwarded-proto') || (isLocal ? 'http' : 'https');
  return `${proto}://${host}`;
}

/** Absolute URL of the public QR application form (used by the share card). */
export async function getPublicJoinUrl(): Promise<string> {
  return `${await resolveAppUrl()}/join`;
}

/**
 * Records a public membership application (one to six people), alerts the
 * admins and acknowledges the primary applicant. Runs with the service-role
 * client because the public form has no authenticated session; every field is
 * re-validated here so the browser cannot bypass a rule. The parent row and the
 * additional applicant rows are written together - on a failed applicant
 * insert the parent is removed so a partial application can never survive.
 */
export async function submitRegistration(
  input: RegistrationSubmission
): Promise<SubmitRegistrationResult> {
  // Honeypot: bots fill hidden fields. Accept silently without writing a row.
  if (cleanText(input.honeypot)) {
    return { success: true, reference: 'EVO' };
  }

  // --- Application kind and the number of people it must cover -------------
  const rawKind = cleanText(input.application_kind, 20);
  const kind = APPLICATION_KINDS.find((option) => option.value === rawKind)?.value ?? null;
  if (!kind) return { error: 'Please choose the type of application.' };

  const additionalRaw = Array.isArray(input.additional) ? input.additional : [];
  if (kind === 'individual' && additionalRaw.length > 0) {
    return { error: 'An individual application covers one person.' };
  }
  if (kind === 'buddy' && additionalRaw.length !== 1) {
    return { error: 'A couple/buddy application needs exactly two people.' };
  }
  if (kind === 'family' && (additionalRaw.length < 2 || additionalRaw.length > 5)) {
    return {
      error: `A family application needs between ${MIN_PARTY_SIZE.family} and ${MAX_PARTY_SIZE.family} people.`,
    };
  }

  // --- People (primary first, then every additional applicant in order) -----
  const primaryResult = validatePerson(input.primary, {
    requirePhone: true,
    requireDob: true,
    label: 'The primary applicant',
  });
  if (!primaryResult.ok) return { error: primaryResult.error };
  const primary = primaryResult.person;

  const additional: ValidatedPerson[] = [];
  for (let index = 0; index < additionalRaw.length; index += 1) {
    const result = validatePerson(additionalRaw[index], {
      requirePhone: false,
      requireDob: false,
      label: `Person ${index + 2}`,
    });
    if (!result.ok) return { error: result.error };
    additional.push(result.person);
  }

  // --- Shared emergency contact ---------------------------------------------
  const emergencyName = cleanText(input.emergency_contact_name, 120);
  const emergencyRelationship = cleanText(input.emergency_contact_relationship, 60);
  const emergencyPhone = cleanText(input.emergency_contact_phone, 25);
  if (!emergencyName || !emergencyRelationship || !emergencyPhone) {
    return { error: 'Emergency contact name, relationship and mobile number are required.' };
  }
  if (!PHONE_PATTERN.test(emergencyPhone)) {
    return { error: 'Please enter a valid emergency contact mobile number.' };
  }

  // --- Consent ---------------------------------------------------------------
  const agreements: Record<string, boolean> = {};
  for (const agreement of AGREEMENTS) {
    if (input.agreements?.[agreement.key] !== true) {
      return { error: 'All conditions and agreements must be accepted to submit.' };
    }
    agreements[agreement.key] = true;
  }
  if (input.member_declaration !== true) {
    return { error: 'Please accept the member declaration to submit.' };
  }

  const admin = createAdminClient();

  // Resolve the preferred plan server-side so name/price cannot be spoofed.
  let plan: { id: string; name: string; price: number } | null = null;
  const requestedPlanId = cleanText(input.preferred_plan_id, 40);
  if (requestedPlanId) {
    const { data: planRow } = await admin
      .from('membership_plans')
      .select('id, name, price, is_active')
      .eq('id', requestedPlanId)
      .maybeSingle();
    if (planRow && planRow.is_active !== false) {
      plan = { id: planRow.id, name: planRow.name, price: Number(planRow.price) };
    }
  }

  const reasons = (input.reasons_for_joining || []).filter(
    (reason): reason is string => typeof reason === 'string' && reason.trim().length > 0
  );
  const referrals = (input.how_did_you_hear || []).filter(
    (source): source is string => typeof source === 'string' && source.trim().length > 0
  );

  const payload = {
    application_kind: kind,
    first_name: primary.first_name,
    last_name: primary.last_name,
    full_name: primary.full_name,
    gender: primary.gender,
    date_of_birth: primary.date_of_birth,
    nic_passport: primary.nic_passport,
    civil_status: primary.civil_status,
    profession: primary.profession,
    phone: primary.phone,
    land_phone: cleanText(input.land_phone, 25),
    email: primary.email,
    residence: cleanText(input.residence, 200),
    city: cleanText(input.city, 80),
    post_code: cleanText(input.post_code, 12),
    office_address: primary.office_address,
    office_city: primary.office_city,
    office_post_code: primary.office_post_code,
    office_land_phone: primary.office_land_phone,
    office_mobile: primary.office_mobile,
    reasons_for_joining: reasons,
    how_did_you_hear: referrals,
    emergency_contact_name: emergencyName,
    emergency_contact_relationship: emergencyRelationship,
    emergency_contact_phone: emergencyPhone,
    emergency_contact_land_phone: cleanText(input.emergency_contact_land_phone, 25),
    parq_answers: primary.parq_answers,
    parq_has_condition: primary.parq_has_condition,
    parq_details: primary.parq_details,
    weight_kg: primary.weight_kg,
    height_cm: primary.height_cm,
    fat_percentage: primary.fat_percentage,
    agreements,
    member_declaration: true,
    preferred_plan_id: plan?.id ?? null,
    preferred_plan: plan?.name ?? null,
    source: 'qr_form',
  };

  const { data: registration, error } = await admin
    .from('member_registrations')
    .insert([payload])
    .select()
    .single();

  if (error || !registration) {
    console.error('Failed to store member registration:', error);
    return {
      error:
        'We could not save your application right now. Please try again, or call the gym and we will register you.',
    };
  }

  // --- Additional applicants (positions 2..n) -------------------------------
  let applicants: MemberRegistrationApplicant[] = [];
  if (additional.length > 0) {
    const rows = additional.map((person, index) => ({
      registration_id: registration.id,
      position: index + 2,
      first_name: person.first_name,
      last_name: person.last_name,
      full_name: person.full_name,
      gender: person.gender,
      date_of_birth: person.date_of_birth,
      nic_passport: person.nic_passport,
      civil_status: person.civil_status,
      profession: person.profession,
      mobile: person.phone,
      email: person.email,
      parq_answers: person.parq_answers,
      parq_has_condition: person.parq_has_condition,
      parq_details: person.parq_details,
      weight_kg: person.weight_kg,
      height_cm: person.height_cm,
      fat_percentage: person.fat_percentage,
    }));

    const { data: inserted, error: applicantsError } = await admin
      .from('member_registration_applicants')
      .insert(rows)
      .select();

    if (applicantsError || !inserted || inserted.length !== rows.length) {
      console.error('Failed to store registration applicants:', applicantsError);
      // Compensating cleanup: never leave a parent application without people.
      await admin.from('member_registrations').delete().eq('id', registration.id);
      return {
        error:
          'We could not save your application right now. Please try again, or call the gym and we will register you.',
      };
    }

    applicants = (inserted as MemberRegistrationApplicant[]).sort(
      (a, b) => a.position - b.position
    );
  }

  const saved: MemberRegistration = { ...(registration as MemberRegistration), applicants };
  const appUrl = await resolveAppUrl();

  const { count: pendingCount } = await admin
    .from('member_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  // Notify admins (best-effort: never fail an accepted application).
  const { data: admins } = await admin.from('profiles').select('email, full_name').eq('role', 'admin');
  const adminRecipients = Array.from(
    new Set(
      [
        ...(admins || []).map((admin) => admin.email as string | null),
        process.env.REGISTRATION_ALERT_EMAIL || null,
      ].filter((value): value is string => Boolean(value && value.includes('@')))
    )
  );

  if (adminRecipients.length > 0) {
    const alert = buildAdminRegistrationAlert(saved, {
      appUrl,
      planPrice: plan?.price ?? null,
      pendingCount: pendingCount ?? undefined,
    });
    const delivery = await sendEmail({
      to: adminRecipients,
      subject: alert.subject,
      html: alert.html,
      replyTo: saved.email || undefined,
    });

    await admin.from('notifications').insert([
      {
        member_id: null,
        channel: 'email',
        type: 'registration_alert',
        status: delivery.success ? 'sent' : 'failed',
        recipient_email: adminRecipients.join(', '),
        subject: alert.subject,
        payload: {
          registration_id: saved.id,
          applicant: saved.full_name,
          application_kind: saved.application_kind,
          people_count: 1 + applicants.length,
          phone: saved.phone,
          preferred_plan: saved.preferred_plan,
        },
        error_message: delivery.success ? null : formatEmailError(delivery.reason ?? delivery.error),
        sent_at: delivery.success ? new Date().toISOString() : null,
      },
    ]);
  }

  if (saved.email) {
    const acknowledgement = buildApplicantAcknowledgement(saved, { planPrice: plan?.price ?? null });
    const delivery = await sendEmail({
      to: saved.email,
      subject: acknowledgement.subject,
      html: acknowledgement.html,
    });

    await admin.from('notifications').insert([
      {
        member_id: null,
        channel: 'email',
        type: 'registration_received',
        status: delivery.success ? 'sent' : 'failed',
        recipient_email: saved.email,
        subject: acknowledgement.subject,
        payload: {
          registration_id: saved.id,
          applicant: saved.full_name,
          people_count: 1 + applicants.length,
        },
        error_message: delivery.success ? null : formatEmailError(delivery.reason ?? delivery.error),
        sent_at: delivery.success ? new Date().toISOString() : null,
      },
    ]);
  }

  await admin.from('audit_log').insert([
    {
      action: 'submit_registration',
      entity_type: 'member_registrations',
      entity_id: saved.id,
      user_id: null,
      user_role: null,
      details: {
        source: 'public_form',
        application_kind: saved.application_kind,
        people_count: 1 + applicants.length,
        preferred_plan: saved.preferred_plan,
        parq_has_condition: saved.parq_has_condition,
      },
    },
  ]);

  revalidatePath('/registrations');
  revalidatePath('/dashboard');

  return { success: true, reference: saved.id.slice(0, 8).toUpperCase() };
}

/* -------------------------------------------------------------------------- */
/* Admin review                                                               */
/* -------------------------------------------------------------------------- */

const REGISTRATION_SELECT = `
  *,
  plan:membership_plans(id, name, price, target_group, duration_type, duration_value),
  member:members(id, full_name, phone, email),
  reviewer:profiles(id, full_name, email)
`;

/** List query: one row per application plus a count of additional applicants. */
const REGISTRATION_LIST_SELECT = `
  ${REGISTRATION_SELECT},
  applicant_count:member_registration_applicants(count)
`;

/** Detail query: the applicants themselves, fetched in the same round trip. */
const REGISTRATION_DETAIL_SELECT = `
  ${REGISTRATION_SELECT},
  applicants:member_registration_applicants(*)
`;

export async function getRegistrations(params?: {
  status?: RegistrationStatus | 'all';
  search?: string;
}): Promise<MemberRegistration[]> {
  const supabase = await createClient();

  let query = supabase
    .from('member_registrations')
    .select(REGISTRATION_LIST_SELECT)
    .order('submitted_at', { ascending: false })
    .limit(200);

  if (params?.status && params.status !== 'all') {
    query = query.eq('status', params.status);
  }

  const term = params?.search?.replace(/[,()]/g, ' ').trim();
  if (term) {
    query = query.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching registrations:', error);
    return [];
  }

  const rows = (data || []) as unknown as Array<
    MemberRegistration & { applicant_count?: Array<{ count: number }> | null }
  >;

  return rows.map((row) => {
    const { applicant_count, ...registration } = row;
    const additional = Array.isArray(applicant_count) ? applicant_count[0]?.count ?? 0 : 0;
    return { ...registration, people_count: 1 + additional };
  });
}

export async function getRegistrationById(id: string): Promise<MemberRegistration | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('member_registrations')
    .select(REGISTRATION_DETAIL_SELECT)
    .eq('id', id)
    .order('position', { referencedTable: 'member_registration_applicants', ascending: true })
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as MemberRegistration;
}

export async function getPendingRegistrationCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('member_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) return 0;
  return count ?? 0;
}

interface MemberMatch {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
}

/**
 * Matches members against a phone and/or email. Legacy rows hold local
 * numbers (`0771234567`) and new submissions hold E.164 (`+94771234567`), so a
 * loose `ilike` query casts a wide net and the last nine digits are compared in
 * JS to decide the real match.
 */
async function findMemberMatchesInternal(
  phone: string | null,
  email: string | null
): Promise<MemberMatch[]> {
  const key = phoneMatchKey(phone);
  const normalizedEmail = email ? email.trim().toLowerCase() : '';

  const filters: string[] = [];
  if (key) filters.push(`phone.ilike.%${key}%`);
  const safeEmail = normalizedEmail.replace(/[,()]/g, '');
  if (safeEmail) filters.push(`email.ilike.%${safeEmail}%`);
  if (filters.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('members')
    .select('id, full_name, phone, email, created_at')
    .or(filters.join(','))
    .limit(20);

  if (error || !data) return [];

  return (data as MemberMatch[])
    .filter((row) => {
      const phoneHit = key ? phoneMatchKey(row.phone) === key : false;
      const emailHit = normalizedEmail
        ? (row.email ?? '').toLowerCase() === normalizedEmail
        : false;
      return phoneHit || emailHit;
    })
    .slice(0, 5);
}

export async function findMemberMatches(phone: string | null, email?: string | null) {
  return findMemberMatchesInternal(phone, email ?? null);
}

function buildMemberNotes(registration: MemberRegistration): string {
  const lines = [`Registered via public QR form (ref ${registration.id.slice(0, 8).toUpperCase()}).`];
  if (registration.office_city || registration.office_post_code) {
    lines.push(`Office: ${[registration.office_city, registration.office_post_code].filter(Boolean).join(' ')}`);
  }
  if (registration.office_mobile) lines.push(`Office mobile: ${registration.office_mobile}`);
  if (registration.how_did_you_hear?.length) {
    lines.push(`Heard about us: ${registration.how_did_you_hear.join(', ')}`);
  }
  return lines.join('\n');
}

/**
 * Approves an application by creating - or matching - one member for every
 * person on it: the primary applicant plus each additional applicant. Existing
 * members matched by phone (last nine digits) or email are reused untouched.
 * Returns the primary member id, which the order handoff links the membership
 * against.
 */
export async function approveRegistration(
  id: string,
  options?: { admin_notes?: string; link_member_id?: string | null }
): Promise<{ success: true; memberId: string } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in to review registrations.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.role !== 'admin') {
    return { error: 'Only administrators can approve registrations.' };
  }

  const { data: registration } = await supabase
    .from('member_registrations')
    .select('*, applicants:member_registration_applicants(*)')
    .eq('id', id)
    .order('position', { referencedTable: 'member_registration_applicants', ascending: true })
    .maybeSingle();

  if (!registration) return { error: 'Registration not found.' };
  const typed = registration as unknown as MemberRegistration;
  if (typed.status !== 'pending') {
    return { error: 'This application has already been reviewed.' };
  }

  const applicants = (typed.applicants ?? []).slice().sort((a, b) => a.position - b.position);
  const auditEntries: Array<Record<string, unknown>> = [];

  // Reviewing an application creates one member row per person, then links the
  // rows back and flips the review status. If any step fails the rows created so
  // far are removed again, so a failed review never leaves orphan members.
  const createdMemberIds: string[] = [];
  async function rollbackCreatedMembers() {
    if (createdMemberIds.length === 0) return;
    const { error } = await supabase.from('members').delete().in('id', createdMemberIds);
    if (error) console.error('Failed to roll back members created by review:', error);
  }

  // --- Primary applicant -----------------------------------------------------
  let memberId = options?.link_member_id || null;
  let primaryCreated = false;

  if (memberId) {
    const { data: existing } = await supabase
      .from('members')
      .select('id')
      .eq('id', memberId)
      .maybeSingle();
    if (!existing) return { error: 'The member selected for linking no longer exists.' };
  } else {
    const matches = await findMemberMatches(typed.phone, typed.email);
    if (matches.length > 0) {
      memberId = matches[0].id;
    } else {
      const { data: member, error: memberError } = await supabase
        .from('members')
        .insert([
          {
            full_name: typed.full_name,
            phone: typed.phone,
            email: typed.email,
            gender: typed.gender,
            nic_passport: typed.nic_passport,
            date_of_birth: typed.date_of_birth,
            residence: typed.residence,
            city: typed.city,
            post_code: typed.post_code,
            land_phone: typed.land_phone,
            civil_status: typed.civil_status,
            profession: typed.profession,
            office_address: typed.office_address,
            emergency_contact_name: typed.emergency_contact_name,
            emergency_contact_relationship: typed.emergency_contact_relationship,
            emergency_contact_phone: typed.emergency_contact_phone,
            emergency_contact_land_phone: typed.emergency_contact_land_phone,
            reasons_for_joining: typed.reasons_for_joining?.join(', ') || null,
            how_did_you_hear: typed.how_did_you_hear?.join(', ') || null,
            parq_has_condition: typed.parq_has_condition,
            parq_details: typed.parq_details,
            weight_kg: typed.weight_kg,
            height_cm: typed.height_cm,
            fat_percentage: typed.fat_percentage,
            preferred_plan: typed.preferred_plan,
            notes: buildMemberNotes(typed),
          },
        ])
        .select('id')
        .single();

      if (memberError || !member) {
        console.error('Failed to create member from registration:', memberError);
        await rollbackCreatedMembers();
        return { error: memberError?.message || 'Failed to create the member record.' };
      }
      memberId = member.id as string;
      primaryCreated = true;
      createdMemberIds.push(memberId);
    }
  }

  auditEntries.push({
    action: 'approve_registration',
    entity_type: 'members',
    entity_id: memberId,
    user_id: user.id,
    user_role: profile.role,
    details: { registration_id: id, role: 'primary', created: primaryCreated },
  });

  // --- Additional applicants -------------------------------------------------
  for (const applicant of applicants) {
    let applicantMemberId: string;
    let created = false;

    const matches = await findMemberMatchesInternal(applicant.mobile, applicant.email);
    if (matches.length > 0) {
      applicantMemberId = matches[0].id;
    } else {
      // `members.phone` is NOT NULL and a dependant - a partner, a child - often
      // has no number of their own, so they keep the household number from the
      // primary applicant: the gym can always reach someone about them.
      const seed: Record<string, unknown> = {
        full_name: applicant.full_name,
        gender: applicant.gender,
        phone: applicant.mobile || typed.phone,
        date_of_birth: applicant.date_of_birth,
        nic_passport: applicant.nic_passport,
        civil_status: applicant.civil_status,
        profession: applicant.profession,
        parq_has_condition: applicant.parq_has_condition,
        parq_details: applicant.parq_details,
        weight_kg: applicant.weight_kg,
        height_cm: applicant.height_cm,
        fat_percentage: applicant.fat_percentage,
      };
      if (applicant.email) seed.email = applicant.email;

      const { data: member, error: memberError } = await supabase
        .from('members')
        .insert([seed])
        .select('id')
        .single();

      if (memberError || !member) {
        console.error('Failed to create member for additional applicant:', memberError);
        await rollbackCreatedMembers();
        return {
          error:
            memberError?.message ||
            `Failed to create a member record for ${applicant.full_name}.`,
        };
      }
      applicantMemberId = member.id as string;
      created = true;
    }

    const { error: linkError } = await supabase
      .from('member_registration_applicants')
      .update({ member_id: applicantMemberId })
      .eq('id', applicant.id);
    if (linkError) {
      console.error('Failed to link applicant to member:', linkError);
      await rollbackCreatedMembers();
      return { error: linkError.message };
    }

    auditEntries.push({
      action: 'approve_registration',
      entity_type: 'members',
      entity_id: applicantMemberId,
      user_id: user.id,
      user_role: profile.role,
      details: {
        registration_id: id,
        role: 'applicant',
        position: applicant.position,
        created,
      },
    });
  }

  const notes = cleanText(options?.admin_notes, 1000);
  const { error: updateError } = await supabase
    .from('member_registrations')
    .update({
      status: 'approved',
      member_id: memberId,
      admin_notes: notes,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) {
    await rollbackCreatedMembers();
    return { error: updateError.message };
  }

  auditEntries.push({
    action: 'approve_registration',
    entity_type: 'member_registrations',
    entity_id: id,
    user_id: user.id,
    user_role: profile.role,
    details: {
      member_id: memberId,
      linked_existing: Boolean(options?.link_member_id),
      people_count: 1 + applicants.length,
      preferred_plan: typed.preferred_plan,
    },
  });

  await supabase.from('audit_log').insert(auditEntries);

  revalidatePath('/registrations');
  revalidatePath(`/registrations/${id}`);
  revalidatePath('/members');
  revalidatePath('/dashboard');

  return { success: true, memberId: memberId as string };
}

export async function rejectRegistration(
  id: string,
  reason: string,
  adminNotes?: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in to review registrations.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.role !== 'admin') {
    return { error: 'Only administrators can reject registrations.' };
  }

  const rejectionReason = cleanText(reason, 500);
  if (!rejectionReason) return { error: 'Please provide a reason for rejecting this application.' };

  const { data: registration } = await supabase
    .from('member_registrations')
    .select('id, status')
    .eq('id', id)
    .maybeSingle();
  if (!registration) return { error: 'Registration not found.' };
  if (registration.status !== 'pending') {
    return { error: 'This application has already been reviewed.' };
  }

  // The applicant rows stay on the application; only the review status changes.
  const { error } = await supabase
    .from('member_registrations')
    .update({
      status: 'rejected',
      rejection_reason: rejectionReason,
      admin_notes: cleanText(adminNotes, 1000),
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) return { error: error.message };

  await supabase.from('audit_log').insert([
    {
      action: 'reject_registration',
      entity_type: 'member_registrations',
      entity_id: id,
      user_id: user.id,
      user_role: profile.role,
      details: { reason: rejectionReason },
    },
  ]);

  revalidatePath('/registrations');
  revalidatePath(`/registrations/${id}`);
  revalidatePath('/dashboard');

  return { success: true };
}

export async function saveRegistrationNotes(
  id: string,
  notes: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in.' };

  const { error } = await supabase
    .from('member_registrations')
    .update({ admin_notes: cleanText(notes, 1000), updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath(`/registrations/${id}`);
  return { success: true };
}

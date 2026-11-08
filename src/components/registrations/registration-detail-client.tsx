'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  approveRegistration,
  rejectRegistration,
  saveRegistrationNotes,
} from '@/app/actions/registrations';
import { AGREEMENTS, PARQ_QUESTIONS, applicationKindLabel } from '@/lib/registration-options';
import type { MemberRegistration } from '@/types/database';
import { calculateAge, cn, formatDate, formatLKR } from '@/lib/utils';
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Dumbbell,
  HeartPulse,
  Home,
  Info,
  Loader2,
  Mail,
  MapPin,
  ShieldCheck,
  User,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';

interface MemberMatch {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
}

interface RegistrationDetailClientProps {
  registration: MemberRegistration;
  memberMatches: MemberMatch[];
  isAdmin: boolean;
}

const STATUS_STYLES: Record<MemberRegistration['status'], string> = {
  pending: 'bg-[#E5B842]/10 border-[#E5B842]/30 text-[#E5B842]',
  approved: 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]',
  rejected: 'bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444]',
};

const inputClass =
  'w-full h-10 px-3 bg-[#18181B] border border-[#27272A] rounded-xl text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#E5B842]';

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function Card({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('card-luxury rounded-2xl bg-[#121214] p-5', className)}>
      <h2 className="text-xs font-bold uppercase tracking-wider text-[#E5B842] flex items-center gap-2 mb-4">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-[#71717A]">{label}</p>
      <p className="text-xs text-[#F4F4F5] mt-0.5 break-words">{value || '-'}</p>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2 py-0.5 rounded-md bg-[#18181B] border border-[#27272A] text-[10px] text-[#D4D4D8]">
      {children}
    </span>
  );
}

/** One row of the application - the primary applicant or an additional person. */
interface PersonView {
  position: number;
  isPrimary: boolean;
  full_name: string;
  gender: string;
  date_of_birth: string | null;
  nic_passport: string | null;
  civil_status: string | null;
  profession: string | null;
  mobile: string | null;
  email: string | null;
  parq_answers: Record<string, boolean>;
  parq_details: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  fat_percentage: number | null;
  member_id: string | null;
}

function PersonCard({ person }: { person: PersonView }) {
  const age = calculateAge(person.date_of_birth);
  const yesAnswers = PARQ_QUESTIONS.filter((question) => Boolean(person.parq_answers?.[question.key]));

  return (
    <Card
      title={`Person ${person.position} - ${person.full_name}`}
      icon={<User className="w-4 h-4" />}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap -mt-1 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {person.isPrimary && (
            <span className="px-2 py-0.5 rounded-full border border-[#E5B842]/30 bg-[#E5B842]/10 text-[10px] font-semibold text-[#E5B842]">
              Primary applicant
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full border border-[#27272A] bg-[#18181B] text-[10px] font-medium text-[#A1A1AA] capitalize">
            {person.gender || '-'}
          </span>
          {yesAnswers.length > 0 && (
            <span className="px-2 py-0.5 rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[10px] font-semibold text-[#F59E0B] flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {yesAnswers.length} yes
            </span>
          )}
        </div>
        {person.member_id ? (
          <Link
            href={`/members/${person.member_id}`}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-[#27272A] bg-[#18181B] text-[11px] text-[#E5B842] hover:border-[#E5B842]/40 transition-colors shrink-0"
          >
            View member
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        ) : (
          <span className="text-[10px] text-[#71717A]">No member linked yet</span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Detail label="Date of birth" value={person.date_of_birth ? `${formatDate(person.date_of_birth)}${age !== null ? ` (${age} yrs)` : ''}` : null} />
        <Detail label="NIC / Passport" value={person.nic_passport} />
        <Detail label="Civil status" value={person.civil_status} />
        <Detail label="Profession" value={person.profession} />
        <Detail
          label="Mobile"
          value={
            person.mobile ? (
              <a href={`tel:${person.mobile}`} className="text-[#E5B842] hover:underline">
                {person.mobile}
              </a>
            ) : null
          }
        />
        <Detail
          label="Email"
          value={
            person.email ? (
              <a href={`mailto:${person.email}`} className="text-[#E5B842] hover:underline break-all">
                {person.email}
              </a>
            ) : null
          }
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-[#27272A]">
        <Detail label="Weight" value={person.weight_kg ? `${person.weight_kg} kg` : null} />
        <Detail label="Height" value={person.height_cm ? `${person.height_cm} cm` : null} />
        <Detail label="Body fat" value={person.fat_percentage ? `${person.fat_percentage}%` : null} />
      </div>

      <div className="mt-4 pt-4 border-t border-[#27272A]">
        <p className="text-[10px] uppercase tracking-wide text-[#71717A] mb-2 flex items-center gap-1.5">
          <HeartPulse className="w-3.5 h-3.5 text-[#E5B842]" />
          PAR-Q health screening
        </p>
        <ol className="space-y-2">
          {PARQ_QUESTIONS.map((question, index) => {
            const answer = Boolean(person.parq_answers?.[question.key]);
            return (
              <li
                key={question.key}
                className={cn(
                  'rounded-xl border px-3 py-2.5 flex items-start justify-between gap-3',
                  answer
                    ? 'border-[#F59E0B]/40 bg-[#F59E0B]/10'
                    : 'border-[#27272A] bg-[#18181B]'
                )}
              >
                <p
                  className={cn(
                    'text-[11px] leading-relaxed',
                    answer ? 'text-[#F4F4F5]' : 'text-[#A1A1AA]'
                  )}
                >
                  <span className="text-[#71717A] mr-1.5">{index + 1}.</span>
                  {question.label}
                </p>
                <span
                  className={cn(
                    'shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-semibold',
                    answer
                      ? 'border-[#F59E0B]/50 bg-[#F59E0B]/15 text-[#F59E0B]'
                      : 'border-[#27272A] bg-[#121214] text-[#71717A]'
                  )}
                >
                  {answer ? 'Yes' : 'No'}
                </span>
              </li>
            );
          })}
        </ol>

        {yesAnswers.length > 0 && (
          <div className="mt-3 rounded-xl border border-[#F59E0B]/40 bg-[#F59E0B]/10 p-3.5">
            <p className="text-[11px] font-semibold text-[#F59E0B] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {yesAnswers.length} question{yesAnswers.length === 1 ? '' : 's'} answered yes
            </p>
            {person.parq_details && (
              <p className="text-[11px] text-[#F4F4F5] mt-1.5 leading-relaxed whitespace-pre-wrap">
                {person.parq_details}
              </p>
            )}
            <p className="text-[10px] text-[#F59E0B] mt-2 leading-relaxed">
              Clear this with a trainer before the first session.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

export function RegistrationDetailClient({
  registration,
  memberMatches,
  isAdmin,
}: RegistrationDetailClientProps) {
  const router = useRouter();
  const [reviewNotes, setReviewNotes] = useState(registration.admin_notes ?? '');
  const [linkMemberId, setLinkMemberId] = useState<string>('');
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [pendingAction, setPendingAction] = useState<'approve' | 'reject' | 'notes' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [approvedMemberId, setApprovedMemberId] = useState<string | null>(null);

  const isPending = registration.status === 'pending';
  const ref = registration.id.slice(0, 8).toUpperCase();
  const planPrice = registration.plan?.price ?? null;

  // Primary applicant lives on the registration row, additional people in
  // `applicants` (position 2 and up). Primary is always position 1.
  const people: PersonView[] = [
    {
      position: 1,
      isPrimary: true,
      full_name: registration.full_name,
      gender: registration.gender,
      date_of_birth: registration.date_of_birth,
      nic_passport: registration.nic_passport,
      civil_status: registration.civil_status,
      profession: registration.profession,
      mobile: registration.phone,
      email: registration.email,
      parq_answers: registration.parq_answers ?? {},
      parq_details: registration.parq_details,
      weight_kg: registration.weight_kg,
      height_cm: registration.height_cm,
      fat_percentage: registration.fat_percentage,
      member_id: registration.member_id,
    },
    ...[...(registration.applicants ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((applicant) => ({
        position: applicant.position,
        isPrimary: false,
        full_name: applicant.full_name,
        gender: applicant.gender,
        date_of_birth: applicant.date_of_birth,
        nic_passport: applicant.nic_passport,
        civil_status: applicant.civil_status,
        profession: applicant.profession,
        mobile: applicant.mobile,
        email: applicant.email,
        parq_answers: applicant.parq_answers ?? {},
        parq_details: applicant.parq_details,
        weight_kg: applicant.weight_kg,
        height_cm: applicant.height_cm,
        fat_percentage: applicant.fat_percentage,
        member_id: applicant.member_id,
      })),
  ];
  const partySize = people.length;
  const flaggedPeople = people.filter(
    (person) => PARQ_QUESTIONS.some((question) => Boolean(person.parq_answers?.[question.key]))
  );
  const primaryMemberId = approvedMemberId ?? registration.member_id;

  async function handleApprove() {
    setPendingAction('approve');
    setError(null);
    setSuccessMessage(null);

    const result = await approveRegistration(registration.id, {
      admin_notes: reviewNotes.trim() || undefined,
      link_member_id: linkMemberId || null,
    });

    if ('error' in result) {
      setError(result.error);
    } else {
      setApprovedMemberId(result.memberId);
      setSuccessMessage(
        partySize > 1
          ? `Application approved. ${partySize} members have been created or matched on one membership.`
          : linkMemberId
            ? 'Application approved and linked to the existing member.'
            : 'Application approved. The member record has been created.'
      );
      router.refresh();
    }
    setPendingAction(null);
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      setError('Please provide a reason for rejecting this application.');
      return;
    }
    setPendingAction('reject');
    setError(null);
    setSuccessMessage(null);

    const result = await rejectRegistration(registration.id, rejectReason, reviewNotes.trim() || undefined);

    if ('error' in result) {
      setError(result.error);
    } else {
      setSuccessMessage('Application rejected.');
      setShowReject(false);
      router.refresh();
    }
    setPendingAction(null);
  }

  async function handleSaveNotes() {
    setPendingAction('notes');
    setError(null);
    setSuccessMessage(null);

    const result = await saveRegistrationNotes(registration.id, reviewNotes);

    if ('error' in result) {
      setError(result.error);
    } else {
      setSuccessMessage('Notes saved.');
    }
    setPendingAction(null);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Application summary */}
        <Card title="Application" icon={<ShieldCheck className="w-4 h-4" />}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold text-[#F4F4F5]">{registration.full_name}</span>
                <span className="px-2 py-0.5 rounded-full border border-[#E5B842]/30 bg-[#E5B842]/10 text-[10px] font-semibold text-[#E5B842]">
                  {applicationKindLabel(registration.application_kind)}
                </span>
                <span className="px-2 py-0.5 rounded-full border border-[#27272A] bg-[#18181B] text-[10px] font-medium text-[#A1A1AA]">
                  {partySize} {partySize === 1 ? 'person' : 'people'}
                </span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full border text-[10px] font-semibold capitalize',
                    STATUS_STYLES[registration.status]
                  )}
                >
                  {registration.status}
                </span>
                {flaggedPeople.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[10px] font-semibold text-[#F59E0B] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Health declaration
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#71717A] mt-1">
                Submitted {formatDateTime(registration.submitted_at)} &bull; via{' '}
                {registration.source === 'qr_form' ? 'public QR form' : registration.source}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
            <Detail label="Reference" value={<span className="tracking-wider text-[#E5B842]">{ref}</span>} />
            <Detail label="People" value={`${partySize}`} />
            <Detail label="Last updated" value={formatDateTime(registration.updated_at)} />
          </div>
        </Card>

        {flaggedPeople.length > 0 && (
          <div className="rounded-2xl border border-[#F59E0B]/40 bg-[#F59E0B]/10 p-4 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-[#F59E0B]">
                Health screening flagged on {flaggedPeople.length}{' '}
                {flaggedPeople.length === 1 ? 'person' : 'people'}
              </p>
              <p className="text-[11px] text-[#D4D4D8] mt-1 leading-relaxed">
                {flaggedPeople.map((person) => person.full_name).join(', ')} answered yes to one or
                more PAR-Q questions. Review each person&apos;s answers below before the first
                session.
              </p>
            </div>
          </div>
        )}

        {/* Everyone on the application */}
        {people.map((person) => (
          <PersonCard key={person.isPrimary ? `primary` : person.full_name + person.position} person={person} />
        ))}

        {/* Household & residence (shared) */}
        <Card title="Household & residence" icon={<Home className="w-4 h-4" />}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Detail label="Residence" value={registration.residence} />
            <Detail label="City" value={registration.city} />
            <Detail label="Post code" value={registration.post_code} />
            <Detail label="Land phone" value={registration.land_phone} />
          </div>
        </Card>

        {/* Office */}
        {(registration.office_address ||
          registration.office_city ||
          registration.office_mobile ||
          registration.office_land_phone) && (
          <Card title="Office details" icon={<MapPin className="w-4 h-4" />}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Detail label="Office" value={registration.office_address} />
              <Detail label="City" value={registration.office_city} />
              <Detail label="Post code" value={registration.office_post_code} />
              <Detail label="Land phone" value={registration.office_land_phone} />
              <Detail label="Mobile" value={registration.office_mobile} />
            </div>
          </Card>
        )}

        {/* Emergency */}
        <Card title="Emergency contact" icon={<Users className="w-4 h-4" />}>
          <div className="grid grid-cols-2 gap-4">
            <Detail label="Name" value={registration.emergency_contact_name} />
            <Detail label="Relationship" value={registration.emergency_contact_relationship} />
            <Detail
              label="Mobile"
              value={
                <a
                  href={`tel:${registration.emergency_contact_phone}`}
                  className="text-[#E5B842] hover:underline"
                >
                  {registration.emergency_contact_phone}
                </a>
              }
            />
            <Detail label="Land phone" value={registration.emergency_contact_land_phone} />
          </div>
        </Card>

        {/* Preferences & consent (shared) */}
        <Card title="Preferences & consent" icon={<Mail className="w-4 h-4" />}>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[#71717A] mb-1.5">
                Preferred membership
              </p>
              {registration.preferred_plan ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <Pill>{registration.preferred_plan}</Pill>
                  {planPrice !== null && (
                    <span className="text-xs font-semibold text-[#F5D061]">
                      {formatLKR(Number(planPrice))}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-[#71717A]">Not selected - applicant will decide at the desk.</p>
              )}
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wide text-[#71717A] mb-1.5">
                Reasons for joining
              </p>
              <div className="flex flex-wrap gap-1.5">
                {registration.reasons_for_joining?.length ? (
                  registration.reasons_for_joining.map((reason) => <Pill key={reason}>{reason}</Pill>)
                ) : (
                  <span className="text-[11px] text-[#71717A]">-</span>
                )}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wide text-[#71717A] mb-1.5">
                How they heard about us
              </p>
              <div className="flex flex-wrap gap-1.5">
                {registration.how_did_you_hear?.length ? (
                  registration.how_did_you_hear.map((source) => <Pill key={source}>{source}</Pill>)
                ) : (
                  <span className="text-[11px] text-[#71717A]">-</span>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-[#27272A]">
              <p className="text-[10px] uppercase tracking-wide text-[#71717A] mb-2">
                Accepted at submission
              </p>
              <ul className="space-y-1.5">
                {AGREEMENTS.map((agreement) => (
                  <li key={agreement.key} className="flex items-start gap-1.5">
                    <Check className="w-3 h-3 text-[#10B981] shrink-0 mt-0.5" strokeWidth={3} />
                    <span className="text-[10px] text-[#D4D4D8] leading-relaxed">
                      {agreement.label}
                    </span>
                  </li>
                ))}
                <li className="flex items-start gap-1.5">
                  <Check className="w-3 h-3 text-[#10B981] shrink-0 mt-0.5" strokeWidth={3} />
                  <span className="text-[10px] text-[#D4D4D8] leading-relaxed">
                    {registration.member_declaration
                      ? 'Member declaration accepted'
                      : 'Member declaration not accepted'}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {/* Review sidebar */}
      <div className="space-y-6">
        <div className="card-luxury rounded-2xl bg-[#121214] p-5 lg:sticky lg:top-6 border-gold-accent">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#F4F4F5] mb-4 pb-3 border-b border-[#27272A]">
            Review
          </h2>

          {successMessage && (
            <div className="mb-3 rounded-xl bg-[#10B981]/10 border border-[#10B981]/30 p-3 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#10B981] leading-relaxed">{successMessage}</p>
            </div>
          )}

          {error && (
            <div className="mb-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#EF4444] leading-relaxed">{error}</p>
            </div>
          )}

          {isPending ? (
            !isAdmin ? (
              <div className="rounded-xl bg-[#18181B] border border-[#27272A] p-3.5 flex items-start gap-2">
                <Info className="w-4 h-4 text-[#A1A1AA] shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                  Only administrators can approve or reject applications. You can still leave a note
                  for the reviewing admin.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {memberMatches.length > 0 && (
                  <div className="rounded-xl border border-[#F59E0B]/40 bg-[#F59E0B]/10 p-3.5">
                    <p className="text-[11px] text-[#F59E0B] font-semibold flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Possible existing member
                    </p>
                    <p className="text-[10px] text-[#D4D4D8] mt-1 leading-relaxed">
                      This mobile number or email already belongs to a member. Link the primary
                      applicant to that member instead of creating a duplicate.
                    </p>
                    <div className="mt-2.5 space-y-1.5">
                      {memberMatches.map((match) => (
                        <label
                          key={match.id}
                          className={cn(
                            'flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors',
                            linkMemberId === match.id
                              ? 'border-[#E5B842] bg-[#E5B842]/10'
                              : 'border-[#27272A] bg-[#18181B] hover:border-[#3F3F46]'
                          )}
                        >
                          <input
                            type="radio"
                            name="link_member"
                            className="sr-only"
                            checked={linkMemberId === match.id}
                            onChange={() => setLinkMemberId(match.id)}
                          />
                          <span
                            className={cn(
                              'w-4 h-4 rounded-full border flex items-center justify-center shrink-0',
                              linkMemberId === match.id
                                ? 'border-[#E5B842] bg-[#E5B842]'
                                : 'border-[#3F3F46]'
                            )}
                          >
                            {linkMemberId === match.id && (
                              <Check className="w-3 h-3 text-[#09090B]" strokeWidth={3} />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[11px] text-[#F4F4F5] truncate">
                              {match.full_name}
                            </span>
                            <span className="block text-[10px] text-[#71717A]">
                              {match.phone} &bull; joined {formatDate(match.created_at)}
                            </span>
                          </span>
                        </label>
                      ))}
                      {linkMemberId && (
                        <button
                          type="button"
                          onClick={() => setLinkMemberId('')}
                          className="text-[10px] text-[#A1A1AA] hover:text-[#F4F4F5] cursor-pointer"
                        >
                          Clear selection (create a new member instead)
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] text-[#D4D4D8] mb-1.5">
                    Review note (optional)
                  </label>
                  <textarea
                    rows={3}
                    value={reviewNotes}
                    onChange={(event) => setReviewNotes(event.target.value)}
                    placeholder="e.g. Walk-in, paid annual plan at the counter"
                    className={cn(inputClass, 'h-auto py-2.5')}
                  />
                </div>

                <div className="rounded-xl bg-[#18181B] border border-[#27272A] p-3">
                  <p className="text-[11px] text-[#D4D4D8] leading-relaxed">
                    Approving creates or matches one member record per person on this application -{' '}
                    <span className="text-[#F5D061] font-semibold">
                      {partySize} {partySize === 1 ? 'member' : 'members'}
                    </span>{' '}
                    will be created or matched.
                    {linkMemberId
                      ? ' The primary applicant is linked to the member you selected; the other people are matched or created.'
                      : ''}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={pendingAction !== null}
                  className="w-full h-11 rounded-xl bg-gold-gradient text-[#09090B] font-bold text-xs hover:brightness-105 transition-all shadow-[0_4px_16px_rgba(229,184,66,0.25)] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {pendingAction === 'approve' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Approving…
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      {linkMemberId
                        ? 'Approve & link primary'
                        : partySize > 1
                          ? `Approve & create ${partySize} members`
                          : 'Approve & add member'}
                    </>
                  )}
                </button>

                <div className="pt-3 border-t border-[#27272A]">
                  {!showReject ? (
                    <button
                      type="button"
                      onClick={() => setShowReject(true)}
                      className="w-full h-10 rounded-xl border border-[#27272A] bg-[#18181B] hover:border-[#EF4444]/40 hover:text-[#EF4444] text-[#A1A1AA] text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject application
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-[11px] text-[#EF4444] font-semibold">Reject this application?</p>
                      <textarea
                        rows={3}
                        value={rejectReason}
                        onChange={(event) => setRejectReason(event.target.value)}
                        placeholder="Reason (required) - e.g. duplicate of existing member, applicant did not respond"
                        className={cn(inputClass, 'h-auto py-2.5')}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowReject(false);
                            setRejectReason('');
                          }}
                          className="flex-1 h-10 rounded-xl border border-[#27272A] bg-[#18181B] text-xs text-[#A1A1AA] hover:text-[#F4F4F5] transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleReject}
                          disabled={pendingAction !== null}
                          className="flex-1 h-10 rounded-xl bg-[#EF4444] text-white text-xs font-semibold hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {pendingAction === 'reject' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Confirm'
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          ) : registration.status === 'approved' ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-[#10B981]/10 border border-[#10B981]/30 p-3.5">
                <p className="text-[11px] text-[#10B981] font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approved
                </p>
                <p className="text-[10px] text-[#D4D4D8] mt-1">
                  {formatDateTime(registration.reviewed_at)}
                  {registration.reviewer?.full_name ? ` by ${registration.reviewer.full_name}` : ''}
                </p>
                {primaryMemberId && (
                  <Link
                    href={`/members/${primaryMemberId}`}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#E5B842] hover:underline"
                  >
                    Open primary member record
                    <ArrowUpRight className="w-3 h-3" />
                  </Link>
                )}
                {approvedMemberId && (
                  <p className="text-[10px] text-[#A1A1AA] mt-1.5 break-all">
                    Primary member id: <span className="text-[#D4D4D8]">{approvedMemberId}</span>
                  </p>
                )}
              </div>

              <div className="rounded-xl bg-[#18181B] border border-[#27272A] p-3.5">
                <p className="text-[11px] text-[#F4F4F5] font-semibold flex items-center gap-1.5">
                  <Dumbbell className="w-3.5 h-3.5 text-[#E5B842]" />
                  Next: create the membership order
                </p>
                <p className="text-[10px] text-[#A1A1AA] mt-1 leading-relaxed">
                  Record the plan, discount, invoice number and the payment received at the counter.
                  The invoice PDF is emailed automatically.
                  {partySize > 1
                    ? ` The membership should cover all ${partySize} people on this application.`
                    : ''}
                </p>
                <Link
                  href={
                    primaryMemberId
                      ? `/memberships/new?member_id=${primaryMemberId}&registration_id=${registration.id}&ref=${ref}&pay=1`
                      : '/memberships/new'
                  }
                  className="mt-3 w-full h-10 rounded-xl bg-gold-gradient text-[#09090B] font-bold text-[11px] hover:brightness-105 transition-all flex items-center justify-center gap-2"
                >
                  Add membership & record payment
                </Link>
                {primaryMemberId && (
                  <Link
                    href={`/memberships/new?member_id=${primaryMemberId}&registration_id=${registration.id}&ref=${ref}`}
                    className="mt-2 w-full h-10 rounded-xl border border-[#27272A] bg-[#121214] text-[#A1A1AA] hover:text-[#F4F4F5] text-[11px] transition-colors flex items-center justify-center"
                  >
                    Create order without payment
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 p-3.5">
              <p className="text-[11px] text-[#EF4444] font-semibold flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" />
                Rejected
              </p>
              <p className="text-[11px] text-[#D4D4D8] mt-1.5 leading-relaxed">
                {registration.rejection_reason || 'No reason recorded.'}
              </p>
              <p className="text-[10px] text-[#71717A] mt-1.5">
                {formatDateTime(registration.reviewed_at)}
                {registration.reviewer?.full_name ? ` by ${registration.reviewer.full_name}` : ''}
              </p>
            </div>
          )}

          {!isPending && (
            <div className="mt-4 pt-4 border-t border-[#27272A]">
              <label className="block text-[11px] text-[#D4D4D8] mb-1.5">Internal notes</label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(event) => setReviewNotes(event.target.value)}
                placeholder="Notes for the team about this applicant"
                className={cn(inputClass, 'h-auto py-2.5')}
              />
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={pendingAction !== null}
                className="mt-2 w-full h-10 rounded-xl border border-[#27272A] bg-[#18181B] hover:border-[#E5B842]/40 text-[#D4D4D8] hover:text-[#F5D061] text-[11px] font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {pendingAction === 'notes' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Save notes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

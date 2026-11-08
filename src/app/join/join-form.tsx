'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Pencil,
  Send,
  User,
  Users,
  UsersRound,
} from 'lucide-react';
import type { ApplicationKind, Gender, MembershipPlan } from '@/types/database';
import { submitRegistration } from '@/app/actions/registrations';
import {
  AGREEMENTS,
  APPLICATION_KINDS,
  MEMBER_DECLARATION,
  REASONS_FOR_JOINING,
  REFERRAL_SOURCES,
  applicationKindSummary,
} from '@/lib/registration-options';
import { formatLKR } from '@/lib/utils';
import {
  ChipGroup,
  CheckRow,
  ChoiceCard,
  Field,
  FieldError,
  InfoNote,
  SectionCard,
  Stepper,
  TextInput,
} from './fields';
import { PhoneField } from './phone-field';
import { PersonBlock } from './person-block';
import { PlanPicker } from './plan-picker';
import { PricingSheet } from '@/components/registrations/pricing-sheet';
import {
  buildSteps,
  createInitialFormState,
  createPersonState,
  toSubmission,
  validateApplication,
  validateStep,
  type FormState,
  type PersonState,
} from './form-state';

/**
 * Public membership application.
 *
 * One screen per decision, mobile first: who is joining, then one identity
 * block per person, then the shared home/emergency details, the membership and
 * finally review + consent. Everything is validated per step; the payload is
 * re-validated server side by `submitRegistration`.
 */

const KIND_ICONS: Record<ApplicationKind, typeof User> = {
  individual: User,
  buddy: Users,
  family: UsersRound,
};

interface JoinFormProps {
  plans: MembershipPlan[];
}

export function JoinForm({ plans }: JoinFormProps) {
  const [form, setForm] = useState<FormState>(createInitialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [pricingOpen, setPricingOpen] = useState(false);
  const stepContainerRef = useRef<HTMLDivElement>(null);

  const steps = useMemo(() => buildSteps(form), [form]);
  const safeStepIndex = Math.min(stepIndex, steps.length - 1);
  const step = steps[safeStepIndex];
  const genders = useMemo(
    () => form.people.map((person) => person.gender as Gender | ''),
    [form.people]
  );

  const updateForm = useCallback((patch: Partial<FormState>) => {
    setForm((current) => ({ ...current, ...patch }));
  }, []);

  const updatePerson = useCallback((index: number, patch: Partial<PersonState>) => {
    setForm((current) => ({
      ...current,
      people: current.people.map((person, position) =>
        position === index ? { ...person, ...patch } : person
      ),
    }));
  }, []);

  const setPeopleCount = useCallback((count: number) => {
    setForm((current) => {
      const people = [...current.people];
      while (people.length < count) people.push(createPersonState());
      if (people.length > count) people.length = count;
      return { ...current, people };
    });
  }, []);

  function selectKind(kind: ApplicationKind) {
    const count = kind === 'individual' ? 1 : kind === 'buddy' ? 2 : Math.max(3, form.people.length);
    setForm((current) => {
      const people = [...current.people];
      while (people.length < count) people.push(createPersonState());
      if (people.length > count) people.length = count;
      return { ...current, kind, people, preferred_plan_id: '' };
    });
    setErrors({});
  }

  function clearError(key: string | string[]) {
    setErrors((current) => {
      const keys = Array.isArray(key) ? key : [key];
      if (!keys.some((entry) => entry in current)) return current;
      const next = { ...current };
      keys.forEach((entry) => delete next[entry]);
      return next;
    });
  }

  function goNext() {
    const stepErrors = validateStep(step, form);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
    stepContainerRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function goBack() {
    setErrors({});
    setStepIndex((current) => Math.max(current - 1, 0));
    stepContainerRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function goToStep(index: number) {
    setErrors({});
    setStepIndex(index);
    stepContainerRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  async function handleSubmit() {
    const { errors: allErrors, firstInvalidStep } = validateApplication(form);
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      if (firstInvalidStep >= 0 && firstInvalidStep !== safeStepIndex) {
        setStepIndex(firstInvalidStep);
        stepContainerRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitRegistration(toSubmission(form));
      if ('error' in result) {
        setSubmitError(result.error);
        return;
      }
      setReference(result.reference);
    } catch {
      setSubmitError('We could not submit your application. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (reference) {
    return <SuccessPanel reference={reference} form={form} onReset={() => {
      setForm(createInitialFormState());
      setErrors({});
      setStepIndex(0);
      setReference(null);
      setSubmitError(null);
    }} />;
  }

  const isLastStep = safeStepIndex === steps.length - 1;
  const progress = ((safeStepIndex + 1) / steps.length) * 100;

  return (
    <div ref={stepContainerRef} className="w-full">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-[12px] font-medium tabular-nums text-[#A1A1AA]">
          Step {safeStepIndex + 1} of {steps.length}
        </span>
        <span className="text-[12px] text-[#71717A]">
          {applicationKindSummary(form.kind || 'individual')}
        </span>
      </div>
      <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-[#18181B]">
        <div
          className="h-full rounded-full bg-gold-gradient transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div key={step.key + String(step.personIndex)} className="animate-step-in">
        <header className="mb-4">
          <h2 className="text-[19px] font-bold tracking-tight text-[#F4F4F5]">{step.title}</h2>
          <p className="mt-1 text-[13px] leading-snug text-[#71717A]">{step.subtitle}</p>
        </header>

        {step.key === 'kind' ? (
          <KindStep form={form} errors={errors} onSelectKind={selectKind} onPeopleCount={setPeopleCount} />
        ) : null}

        {step.key === 'person' ? (
          <SectionCard title={`Person ${step.personIndex + 1}`} description="All fields marked with * are required.">
            <PersonBlock
              index={step.personIndex}
              person={form.people[step.personIndex]}
              primary={step.personIndex === 0}
              onChange={(patch) => {
                updatePerson(step.personIndex, patch);
                clearError(
                  Object.keys(patch).map((field) => `p${step.personIndex}.${field}`)
                );
                clearError(`p${step.personIndex}.parq`);
              }}
              errors={errors}
            />
          </SectionCard>
        ) : null}

        {step.key === 'home' ? <HomeStep form={form} errors={errors} updateForm={updateForm} clearError={clearError} /> : null}

        {step.key === 'membership' ? (
          <MembershipStep
            form={form}
            plans={plans}
            genders={genders}
            errors={errors}
            updateForm={updateForm}
            onGenderChange={(index, gender) => {
              updatePerson(index, { gender });
              clearError(`p${index}.gender`);
            }}
            onOpenPricing={() => setPricingOpen(true)}
          />
        ) : null}

        {step.key === 'review' ? (
          <ReviewStep
            form={form}
            plans={plans}
            errors={errors}
            updateForm={updateForm}
            clearError={clearError}
            onEdit={goToStep}
          />
        ) : null}
      </div>

      <FieldError>{submitError}</FieldError>

      <div className="sticky bottom-0 z-20 mt-6 -mx-4 border-t border-[#27272A] bg-[#09090B]/95 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4 backdrop-blur">
        <div className="flex items-center gap-3">
          {safeStepIndex > 0 ? (
            <button
              type="button"
              onClick={goBack}
              disabled={submitting}
              className="flex min-h-12 items-center gap-1.5 rounded-2xl border border-[#27272A] bg-[#121214] px-4 text-[14px] font-medium text-[#D4D4D8] transition-colors hover:border-[#3F3F46] disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back
            </button>
          ) : null}

          {isLastStep ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gold-gradient px-5 text-[15px] font-semibold text-[#09090B] transition-transform duration-150 active:scale-[0.99] disabled:opacity-70"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Send className="h-4 w-4" aria-hidden />
              )}
              {submitting ? 'Submitting…' : 'Submit application'}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gold-gradient px-5 text-[15px] font-semibold text-[#09090B] transition-transform duration-150 active:scale-[0.99]"
            >
              Continue
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </div>

      {/* Honeypot: must stay empty. Name/id are intentionally unmemorable so
          browsers do not autofill it. tabIndex -1 and aria-hidden keep it out
          of the accessible/keyboard tree; pointer-events-none ensures a real
          user can never accidentally type into it. */}
      <input
        type="text"
        name="ef_xp_7k2"
        id="ef_xp_7k2"
        tabIndex={-1}
        autoComplete="new-password"
        aria-hidden="true"
        readOnly
        value=""
        onChange={() => {}}
        className="pointer-events-none absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      <PricingSheet
        plans={plans}
        open={pricingOpen}
        onOpenChange={setPricingOpen}
        selectedPlanId={form.preferred_plan_id}
        onSelect={(plan) => {
          updateForm({ preferred_plan_id: plan.id });
          setPricingOpen(false);
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Steps                                                                      */
/* -------------------------------------------------------------------------- */

function KindStep({
  form,
  errors,
  onSelectKind,
  onPeopleCount,
}: {
  form: FormState;
  errors: Record<string, string>;
  onSelectKind: (kind: ApplicationKind) => void;
  onPeopleCount: (count: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5">
        {APPLICATION_KINDS.map((option) => (
          <ChoiceCard
            key={option.value}
            title={option.label}
            description={option.detail}
            badge={option.summary}
            icon={(() => {
              const Icon = KIND_ICONS[option.value];
              return <Icon className="h-4 w-4" aria-hidden />;
            })()}
            selected={form.kind === option.value}
            onSelect={() => onSelectKind(option.value)}
          />
        ))}
      </div>
      <FieldError>{errors.kind}</FieldError>

      {form.kind === 'family' ? (
        <SectionCard
          title="How many people?"
          description="A family membership covers 3 to 6 people. Each person gets their own block below."
        >
          <Stepper
            label="family size"
            value={form.people.length}
            min={3}
            max={6}
            onChange={onPeopleCount}
          />
        </SectionCard>
      ) : null}

      {form.kind === 'buddy' ? (
        <InfoNote>
          A couple or buddy membership covers exactly two people. Both of you fill in your own
          details on the next steps.
        </InfoNote>
      ) : null}

      {form.kind === 'individual' ? (
        <InfoNote>One membership for you. The next step collects your details.</InfoNote>
      ) : null}
    </div>
  );
}

function HomeStep({
  form,
  errors,
  updateForm,
  clearError,
}: {
  form: FormState;
  errors: Record<string, string>;
  updateForm: (patch: Partial<FormState>) => void;
  clearError: (key: string | string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Residence"
        description="Shared by everyone on this application."
      >
        <Field label="Residence" htmlFor="residence" required error={errors.residence}>
          <TextInput
            id="residence"
            value={form.residence}
            invalid={Boolean(errors.residence)}
            autoComplete="street-address"
            onChange={(event) => {
              updateForm({ residence: event.target.value });
              clearError('residence');
            }}
            placeholder="No 21, Temple Road"
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="City" htmlFor="city" required error={errors.city}>
            <TextInput
              id="city"
              value={form.city}
              invalid={Boolean(errors.city)}
              autoComplete="address-level2"
              onChange={(event) => {
                updateForm({ city: event.target.value });
                clearError('city');
              }}
              placeholder="Colombo 05"
            />
          </Field>
          <Field label="Post code" htmlFor="post_code" optional>
            <TextInput
              id="post_code"
              value={form.post_code}
              inputMode="numeric"
              autoComplete="postal-code"
              onChange={(event) => updateForm({ post_code: event.target.value })}
              placeholder="00500"
            />
          </Field>
        </div>
        <Field label="Land phone" htmlFor="land_phone" optional hint="Include the area code.">
          <TextInput
            id="land_phone"
            value={form.land_phone}
            inputMode="tel"
            onChange={(event) => updateForm({ land_phone: event.target.value })}
            placeholder="011 234 5678"
          />
        </Field>
      </SectionCard>

      <SectionCard
        title="Emergency contact"
        description="Who should we call if something happens during a session?"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Name"
            htmlFor="emergency_contact_name"
            required
            error={errors.emergency_contact_name}
          >
            <TextInput
              id="emergency_contact_name"
              value={form.emergency_contact_name}
              invalid={Boolean(errors.emergency_contact_name)}
              onChange={(event) => {
                updateForm({ emergency_contact_name: event.target.value });
                clearError('emergency_contact_name');
              }}
              placeholder="Nimali Perera"
            />
          </Field>
          <Field
            label="Relationship"
            htmlFor="emergency_contact_relationship"
            required
            error={errors.emergency_contact_relationship}
          >
            <TextInput
              id="emergency_contact_relationship"
              value={form.emergency_contact_relationship}
              invalid={Boolean(errors.emergency_contact_relationship)}
              onChange={(event) => {
                updateForm({ emergency_contact_relationship: event.target.value });
                clearError('emergency_contact_relationship');
              }}
              placeholder="Spouse"
            />
          </Field>
        </div>

        <PhoneField
          id="emergency_contact_phone"
          label="Mobile"
          required
          value={form.emergency_contact_phone}
          country={form.emergency_contact_country}
          error={errors.emergency_contact_phone}
          onValueChange={(value) => {
            updateForm({ emergency_contact_phone: value });
            clearError('emergency_contact_phone');
          }}
          onCountryChange={(country) => updateForm({ emergency_contact_country: country })}
        />

        <Field label="Land phone" htmlFor="emergency_contact_land_phone" optional>
          <TextInput
            id="emergency_contact_land_phone"
            value={form.emergency_contact_land_phone}
            inputMode="tel"
            onChange={(event) => updateForm({ emergency_contact_land_phone: event.target.value })}
          />
        </Field>
      </SectionCard>
    </div>
  );
}

function MembershipStep({
  form,
  plans,
  genders,
  errors,
  updateForm,
  onGenderChange,
  onOpenPricing,
}: {
  form: FormState;
  plans: MembershipPlan[];
  genders: ReadonlyArray<Gender | ''>;
  errors: Record<string, string>;
  updateForm: (patch: Partial<FormState>) => void;
  onGenderChange: (index: number, gender: Gender) => void;
  onOpenPricing: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Choose your membership"
        description="Prices are in LKR. Personal training is quoted separately at the gym."
      >
        <PlanPicker
          plans={plans}
          kind={(form.kind || 'individual') as ApplicationKind}
          genders={genders}
          selectedPlanId={form.preferred_plan_id}
          onSelect={(planId) => updateForm({ preferred_plan_id: planId })}
          onGenderChange={onGenderChange}
          onOpenPricing={onOpenPricing}
        />
      </SectionCard>

      <SectionCard title="What brings you in?" description="Select all that apply.">
        <ChipGroup
          multi
          ariaLabel="Reasons for joining"
          options={REASONS_FOR_JOINING.map((reason) => ({ value: reason, label: reason }))}
          value={form.reasons_for_joining}
          onChange={(value) => updateForm({ reasons_for_joining: value })}
        />
      </SectionCard>

      <SectionCard title="How did you hear about us?" description="Select all that apply.">
        <ChipGroup
          multi
          ariaLabel="How did you hear about us"
          options={REFERRAL_SOURCES.map((source) => ({ value: source, label: source }))}
          value={form.how_did_you_hear}
          onChange={(value) => updateForm({ how_did_you_hear: value })}
        />
      </SectionCard>

      <FieldError>{errors.membership}</FieldError>
    </div>
  );
}

function ReviewStep({
  form,
  plans,
  errors,
  updateForm,
  clearError,
  onEdit,
}: {
  form: FormState;
  plans: MembershipPlan[];
  errors: Record<string, string>;
  updateForm: (patch: Partial<FormState>) => void;
  clearError: (key: string | string[]) => void;
  onEdit: (index: number) => void;
}) {
  const steps = buildSteps(form);
  const personStepIndex = (index: number) => 1 + index;
  const homeStepIndex = steps.findIndex((entry) => entry.key === 'home');
  const membershipStepIndex = steps.findIndex((entry) => entry.key === 'membership');
  const selectedPlan = plans.find((plan) => plan.id === form.preferred_plan_id) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title={applicationKindSummary(form.kind || 'individual')}
        description={`${form.people.length} ${form.people.length === 1 ? 'person' : 'people'} on this application.`}
      >
        <div className="flex flex-col gap-3">
          {form.people.map((person, index) => {
            const flagged = Object.values(person.parq_answers).filter(Boolean).length;
            return (
              <div
                key={index}
                className="rounded-2xl border border-[#27272A] bg-[#09090B] p-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#F4F4F5]">
                      {person.first_name || person.last_name
                        ? `${person.first_name} ${person.last_name}`.trim()
                        : `Person ${index + 1}`}
                      {index === 0 ? (
                        <span className="ml-2 rounded-full border border-[#E5B842]/30 bg-[#E5B842]/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#F5D061]">
                          Primary
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-[12.5px] text-[#A1A1AA]">
                      {[person.gender, person.date_of_birth, person.phone]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    <p className="mt-1 text-[12px] text-[#71717A]">
                      PAR-Q: {flagged === 0 ? 'no conditions flagged' : `${flagged} answered YES`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEdit(personStepIndex(index))}
                    className="flex min-h-9 items-center gap-1.5 rounded-xl border border-[#27272A] bg-[#121214] px-3 text-[12px] text-[#A1A1AA] transition-colors hover:text-[#F4F4F5]"
                  >
                    <Pencil className="h-3 w-3" aria-hidden />
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Home & emergency">
        <dl className="flex flex-col gap-2 text-[13px]">
          <SummaryRow
            label="Residence"
            value={[form.residence, form.city, form.post_code].filter(Boolean).join(', ')}
            onEdit={() => onEdit(homeStepIndex)}
          />
          <SummaryRow
            label="Emergency contact"
            value={[
              form.emergency_contact_name,
              form.emergency_contact_relationship,
              form.emergency_contact_phone,
            ]
              .filter(Boolean)
              .join(' · ')}
          />
        </dl>
      </SectionCard>

      <SectionCard title="Membership">
        <dl className="flex flex-col gap-2 text-[13px]">
          <SummaryRow
            label="Preferred plan"
            value={
              selectedPlan
                ? `${selectedPlan.name} — ${formatLKR(Number(selectedPlan.price))}`
                : 'Not selected — our team will confirm with you'
            }
            onEdit={() => onEdit(membershipStepIndex)}
          />
          <SummaryRow
            label="Reasons"
            value={form.reasons_for_joining.join(', ') || '—'}
          />
          <SummaryRow label="Heard via" value={form.how_did_you_hear.join(', ') || '—'} />
        </dl>
      </SectionCard>

      <SectionCard title="Conditions & consent" description="All of these are required.">
        {AGREEMENTS.map((agreement) => (
          <CheckRow
            key={agreement.key}
            id={`agreement-${agreement.key}`}
            checked={form.agreements[agreement.key] === true}
            invalid={Boolean(errors.agreements)}
            onChange={(checked) => {
              updateForm({ agreements: { ...form.agreements, [agreement.key]: checked } });
              clearError('agreements');
            }}
          >
            {agreement.label}
          </CheckRow>
        ))}
        <FieldError>{errors.agreements}</FieldError>

        <CheckRow
          id="member_declaration"
          checked={form.member_declaration}
          invalid={Boolean(errors.member_declaration)}
          onChange={(checked) => {
            updateForm({ member_declaration: checked });
            clearError('member_declaration');
          }}
        >
          {MEMBER_DECLARATION}
        </CheckRow>
        <FieldError>{errors.member_declaration}</FieldError>
      </SectionCard>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <dt className="text-[11px] uppercase tracking-wide text-[#71717A]">{label}</dt>
        <dd className="mt-0.5 text-[13.5px] text-[#D4D4D8]">{value}</dd>
      </div>
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="flex min-h-9 items-center gap-1.5 rounded-xl border border-[#27272A] bg-[#121212] px-3 text-[12px] text-[#A1A1AA] transition-colors hover:text-[#F4F4F5]"
        >
          <Pencil className="h-3 w-3" aria-hidden />
          Edit
        </button>
      ) : null}
    </div>
  );
}

function SuccessPanel({
  reference,
  form,
  onReset,
}: {
  reference: string;
  form: FormState;
  onReset: () => void;
}) {
  const extra = form.people.length - 1;
  return (
    <div className="animate-step-in flex flex-col items-center gap-4 rounded-3xl border border-[#E5B842]/35 bg-[#121214] p-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981]">
        <CheckCircle2 className="h-7 w-7" aria-hidden />
      </span>
      <div>
        <h2 className="text-[19px] font-bold tracking-tight text-[#F4F4F5]">
          Application received
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-[#A1A1AA]">
          Thank you{form.people[0]?.first_name ? `, ${form.people[0].first_name}` : ''}. Our team will
          review your application and contact you to activate your membership
          {extra > 0 ? ` for all ${form.people.length} people on it` : ''}.
        </p>
      </div>
      <div className="rounded-2xl border border-[#27272A] bg-[#09090B] px-4 py-3">
        <span className="block text-[11px] uppercase tracking-wide text-[#71717A]">
          Application reference
        </span>
        <span className="mt-1 block font-mono text-[15px] tracking-wide text-[#F5D061]">
          {reference}
        </span>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="min-h-12 rounded-2xl border border-[#27272A] bg-[#18181B] px-5 text-[14px] font-medium text-[#D4D4D8] transition-colors hover:border-[#3F3F46]"
      >
        Submit another application
      </button>
    </div>
  );
}

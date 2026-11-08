'use client';

import { ChipGroup, Field, InfoNote, TextInput } from './fields';
import { DobField } from './dob-field';
import { PhoneField } from './phone-field';
import { ParqBlock } from './parq-block';
import type { PersonState } from './form-state';
import { CIVIL_STATUSES } from '@/lib/registration-options';

/**
 * Everything captured for a single person on an application.
 *
 * Person 1 is the primary applicant: they additionally carry the office
 * details and the required mobile number; everyone else shares the household
 * address and emergency contact.
 */

const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export interface PersonBlockProps {
  index: number;
  person: PersonState;
  primary: boolean;
  onChange: (patch: Partial<PersonState>) => void;
  errors: Record<string, string>;
}

export function PersonBlock({ index, person, primary, onChange, errors }: PersonBlockProps) {
  const prefix = `p${index}.`;
  const error = (field: string) => errors[`${prefix}${field}`];

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-4">
        <h3 className="text-[14px] font-semibold tracking-tight text-[#F4F4F5]">Identity</h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor={`${prefix}first_name`} required error={error('first_name')}>
            <TextInput
              id={`${prefix}first_name`}
              value={person.first_name}
              invalid={Boolean(error('first_name'))}
              autoComplete="given-name"
              onChange={(event) => onChange({ first_name: event.target.value })}
              placeholder="Kasun"
            />
          </Field>
          <Field label="Last name" htmlFor={`${prefix}last_name`} required error={error('last_name')}>
            <TextInput
              id={`${prefix}last_name`}
              value={person.last_name}
              invalid={Boolean(error('last_name'))}
              autoComplete="family-name"
              onChange={(event) => onChange({ last_name: event.target.value })}
              placeholder="Perera"
            />
          </Field>
        </div>

        <Field label="Gender" required error={error('gender')}>
          <ChipGroup
            ariaLabel="Gender"
            options={GENDERS}
            value={person.gender}
            onChange={(value) => onChange({ gender: value as PersonState['gender'] })}
          />
        </Field>

        <DobField
          id={`${prefix}date_of_birth`}
          label="Date of birth"
          required={primary}
          optional={!primary}
          value={person.date_of_birth}
          onChange={(value) => onChange({ date_of_birth: value })}
          error={error('date_of_birth')}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="NIC / Passport / Licence"
            htmlFor={`${prefix}nic_passport`}
            optional
            error={error('nic_passport')}
          >
            <TextInput
              id={`${prefix}nic_passport`}
              value={person.nic_passport}
              invalid={Boolean(error('nic_passport'))}
              onChange={(event) => onChange({ nic_passport: event.target.value })}
              placeholder="199012345678"
            />
          </Field>
          <Field label="Profession" htmlFor={`${prefix}profession`} optional error={error('profession')}>
            <TextInput
              id={`${prefix}profession`}
              value={person.profession}
              invalid={Boolean(error('profession'))}
              onChange={(event) => onChange({ profession: event.target.value })}
              placeholder="Engineer"
            />
          </Field>
        </div>

        <Field label="Civil status" optional error={error('civil_status')}>
          <ChipGroup
            ariaLabel="Civil status"
            options={CIVIL_STATUSES.map((status) => ({ value: status, label: status }))}
            value={person.civil_status}
            onChange={(value) => onChange({ civil_status: value })}
          />
        </Field>
      </section>

      <div className="h-px bg-[#27272A]" />

      <section className="flex flex-col gap-4">
        <h3 className="text-[14px] font-semibold tracking-tight text-[#F4F4F5]">Contact</h3>

        <PhoneField
          id={`${prefix}phone`}
          label="Mobile"
          required={primary}
          optional={!primary}
          value={person.phone}
          country={person.phone_country}
          error={error('phone')}
          onValueChange={(value) => onChange({ phone: value })}
          onCountryChange={(country) => onChange({ phone_country: country })}
          hint="Pick your country, then type your number without the leading zero."
        />

        <Field label="Email" htmlFor={`${prefix}email`} optional error={error('email')}>
          <TextInput
            id={`${prefix}email`}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={person.email}
            invalid={Boolean(error('email'))}
            onChange={(event) => onChange({ email: event.target.value })}
            placeholder="you@example.com"
          />
        </Field>
      </section>

      {primary ? (
        <>
          <div className="h-px bg-[#27272A]" />

          <section className="flex flex-col gap-4">
            <div>
              <h3 className="text-[14px] font-semibold tracking-tight text-[#F4F4F5]">
                Office details
              </h3>
              <p className="mt-1 text-[12.5px] text-[#71717A]">
                Only if your employer pays for or subsidises your membership.
              </p>
            </div>

            <Field label="Office address" htmlFor={`${prefix}office_address`} optional>
              <TextInput
                id={`${prefix}office_address`}
                value={person.office_address}
                onChange={(event) => onChange({ office_address: event.target.value })}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Office city" htmlFor={`${prefix}office_city`} optional>
                <TextInput
                  id={`${prefix}office_city`}
                  value={person.office_city}
                  onChange={(event) => onChange({ office_city: event.target.value })}
                />
              </Field>
              <Field label="Office post code" htmlFor={`${prefix}office_post_code`} optional>
                <TextInput
                  id={`${prefix}office_post_code`}
                  value={person.office_post_code}
                  onChange={(event) => onChange({ office_post_code: event.target.value })}
                />
              </Field>
              <Field label="Office land phone" htmlFor={`${prefix}office_land_phone`} optional>
                <TextInput
                  id={`${prefix}office_land_phone`}
                  inputMode="tel"
                  value={person.office_land_phone}
                  onChange={(event) => onChange({ office_land_phone: event.target.value })}
                />
              </Field>
              <Field label="Office mobile" htmlFor={`${prefix}office_mobile`} optional>
                <TextInput
                  id={`${prefix}office_mobile`}
                  inputMode="tel"
                  value={person.office_mobile}
                  onChange={(event) => onChange({ office_mobile: event.target.value })}
                />
              </Field>
            </div>
          </section>
        </>
      ) : (
        <InfoNote>
          Person {index + 1} shares the home address and emergency contact you entered for person 1.
        </InfoNote>
      )}

      <div className="h-px bg-[#27272A]" />

      <ParqBlock
        index={index}
        answers={person.parq_answers}
        details={person.parq_details}
        weight={person.weight_kg}
        height={person.height_cm}
        fat={person.fat_percentage}
        onAnswer={(key, value) =>
          onChange({ parq_answers: { ...person.parq_answers, [key]: value } })
        }
        onDetailsChange={(value) => onChange({ parq_details: value })}
        onMeasurementChange={(field, value) => onChange({ [field]: value } as Partial<PersonState>)}
        errors={errors}
      />
    </div>
  );
}

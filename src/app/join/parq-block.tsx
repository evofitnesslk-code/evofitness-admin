'use client';

import { InfoNote, TextArea, TextInput, YesNo, FieldError } from './fields';
import { PARQ_QUESTIONS } from '@/lib/registration-options';
import { cn } from '@/lib/utils';

/**
 * Physical Activity Readiness screening for one person.
 *
 * Every person on an application answers all seven PAR-Q questions; when any
 * answer is YES that person must describe the condition. Measurements are
 * optional but validated when present.
 */

export interface ParqBlockProps {
  index: number;
  answers: Record<string, boolean>;
  details: string;
  weight: string;
  height: string;
  fat: string;
  onAnswer: (key: string, value: boolean) => void;
  onDetailsChange: (value: string) => void;
  onMeasurementChange: (field: 'weight_kg' | 'height_cm' | 'fat_percentage', value: string) => void;
  errors: Record<string, string>;
}

export function ParqBlock({
  index,
  answers,
  details,
  weight,
  height,
  fat,
  onAnswer,
  onDetailsChange,
  onMeasurementChange,
  errors,
}: ParqBlockProps) {
  const prefix = `p${index}.`;
  const parqError = errors[`${prefix}parq`];
  const detailsError = errors[`${prefix}parq_details`];
  const flagged = PARQ_QUESTIONS.some((question) => answers[question.key] === true);
  const unanswered = PARQ_QUESTIONS.filter(
    (question) => typeof answers[question.key] !== 'boolean'
  ).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[14px] font-semibold tracking-tight text-[#F4F4F5]">
          Health screening (PAR-Q)
        </h3>
        <span
          className={cn(
            'text-[11.5px] tabular-nums',
            parqError ? 'text-[#EF4444]' : 'text-[#71717A]'
          )}
        >
          {unanswered === 0
            ? 'All 7 answered'
            : `${PARQ_QUESTIONS.length - unanswered} of ${PARQ_QUESTIONS.length} answered`}
        </span>
      </div>

      <ol className="flex flex-col gap-2.5">
        {PARQ_QUESTIONS.map((question, position) => {
          const answer = answers[question.key];
          return (
            <li
              key={question.key}
              className={cn(
                'rounded-2xl border p-3.5 transition-colors duration-150',
                answer === true
                  ? 'border-[#F59E0B]/40 bg-[#F59E0B]/6'
                  : 'border-[#27272A] bg-[#09090B]'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="flex-1 text-[13.5px] leading-relaxed text-[#D4D4D8]">
                  <span className="mr-1.5 tabular-nums text-[#71717A]">{position + 1}.</span>
                  {question.label}
                </p>
                <YesNo
                  name={`${prefix}${question.key}`}
                  value={answer}
                  onChange={(value) => onAnswer(question.key, value)}
                />
              </div>
            </li>
          );
        })}
      </ol>

      <FieldError id={`${prefix}parq-error`}>{parqError}</FieldError>

      {flagged ? (
        <div className="flex flex-col gap-2">
          <label
            htmlFor={`${prefix}parq_details`}
            className="flex items-baseline gap-1.5 text-[13px] font-medium text-[#D4D4D8]"
          >
            <span>Please describe the questions you answered YES to</span>
            <span aria-hidden className="text-[#E5B842]">
              *
            </span>
          </label>
          <TextArea
            id={`${prefix}parq_details`}
            value={details}
            invalid={Boolean(detailsError)}
            onChange={(event) => onDetailsChange(event.target.value)}
            placeholder="Condition, medication, or anything our trainers should know before your first session."
          />
          <FieldError>{detailsError}</FieldError>
          <InfoNote tone="warning">
            Our team will review this with you before you train. Please consult your doctor if you
            are unsure about exercising.
          </InfoNote>
        </div>
      ) : null}

      <div>
        <h4 className="mb-2 text-[13px] font-medium text-[#D4D4D8]">
          Measurements <span className="text-[11px] font-normal text-[#71717A]">Optional</span>
        </h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MeasurementInput
            id={`${prefix}weight_kg`}
            label="Weight"
            suffix="kg"
            value={weight}
            error={errors[`${prefix}weight_kg`]}
            onChange={(value) => onMeasurementChange('weight_kg', value)}
          />
          <MeasurementInput
            id={`${prefix}height_cm`}
            label="Height"
            suffix="cm"
            value={height}
            error={errors[`${prefix}height_cm`]}
            onChange={(value) => onMeasurementChange('height_cm', value)}
          />
          <MeasurementInput
            id={`${prefix}fat_percentage`}
            label="Body fat"
            suffix="%"
            value={fat}
            error={errors[`${prefix}fat_percentage`]}
            onChange={(value) => onMeasurementChange('fat_percentage', value)}
          />
        </div>
      </div>
    </div>
  );
}

function MeasurementInput({
  id,
  label,
  suffix,
  value,
  error,
  onChange,
}: {
  id: string;
  label: string;
  suffix: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[12.5px] text-[#A1A1AA]">
        {label}
      </label>
      <div className="relative">
        <TextInput
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.target.value.replace(/[^\d.]/g, ''))}
          className="pr-11"
          placeholder="—"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-[#71717A]">
          {suffix}
        </span>
      </div>
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  );
}

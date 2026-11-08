'use client';

import type {
  ChangeEvent,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Form primitives for the public application form.
 *
 * Apple-HIG leaning: one clear label per field, generous touch targets (48 px
 * input rows), calm dark surfaces, gold reserved for focus and selection.
 * Dropdowns are avoided on purpose - single choices are chips, groups are cards.
 */

const LABEL_CLASS = 'flex items-baseline gap-1.5 text-[13px] font-medium text-[#D4D4D8]';

const INPUT_CLASS =
  'w-full h-12 rounded-2xl bg-[#121214] border px-4 text-[15px] text-[#F4F4F5] ' +
  'placeholder:text-[#52525B] outline-none transition-colors duration-150 ' +
  'focus:bg-[#18181B] focus:border-[#E5B842]/70 focus:ring-2 focus:ring-[#E5B842]/15 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const ERROR_INPUT_CLASS = 'border-[#EF4444]/70 focus:border-[#EF4444] focus:ring-[#EF4444]/15';
const IDLE_INPUT_CLASS = 'border-[#27272A]';

export function FieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-[12px] leading-snug text-[#EF4444]">
      {children}
    </p>
  );
}

export interface FieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
  hint?: ReactNode;
  error?: string;
  errorId?: string;
  className?: string;
  children: ReactNode;
}

export function Field({
  label,
  htmlFor,
  required,
  optional,
  hint,
  error,
  errorId,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label className={LABEL_CLASS} htmlFor={htmlFor}>
        <span>{label}</span>
        {required ? (
          <span aria-hidden className="text-[#E5B842]">
            *
          </span>
        ) : null}
        {optional ? (
          <span className="text-[11px] font-normal text-[#71717A]">Optional</span>
        ) : null}
      </label>
      {children}
      {hint && !error ? <p className="text-[12px] leading-snug text-[#71717A]">{hint}</p> : null}
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function TextInput({ invalid, className, ...props }: TextInputProps) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={cn(INPUT_CLASS, invalid ? ERROR_INPUT_CLASS : IDLE_INPUT_CLASS, className)}
    />
  );
}

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function TextArea({ invalid, className, ...props }: TextAreaProps) {
  return (
    <textarea
      {...props}
      aria-invalid={invalid || undefined}
      className={cn(
        INPUT_CLASS,
        'h-auto min-h-[96px] py-3 leading-relaxed resize-y',
        invalid ? ERROR_INPUT_CLASS : IDLE_INPUT_CLASS,
        className
      )}
    />
  );
}

export interface ChipOption {
  value: string;
  label: string;
}

interface ChipGroupBaseProps {
  options: ReadonlyArray<ChipOption>;
  className?: string;
  ariaLabel: string;
}

export interface SingleChipGroupProps extends ChipGroupBaseProps {
  multi?: false;
  value: string;
  onChange: (value: string) => void;
}

export interface MultiChipGroupProps extends ChipGroupBaseProps {
  multi: true;
  value: string[];
  onChange: (value: string[]) => void;
}

/** Tappable chips: one active at a time, or many. Never renders a `<select>`. */
export function ChipGroup(props: SingleChipGroupProps | MultiChipGroupProps) {
  const { options, className, ariaLabel } = props;

  return (
    <div role="group" aria-label={ariaLabel} className={cn('flex flex-wrap gap-2', className)}>
      {options.map((option) => {
        const selected = props.multi
          ? props.value.includes(option.value)
          : props.value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => {
              if (props.multi) {
                props.onChange(
                  selected
                    ? props.value.filter((entry) => entry !== option.value)
                    : [...props.value, option.value]
                );
              } else {
                props.onChange(option.value);
              }
            }}
            className={cn(
              'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[14px]',
              'transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97]',
              selected
                ? 'border-[#E5B842]/60 bg-[#E5B842]/12 text-[#F5D061]'
                : 'border-[#27272A] bg-[#121214] text-[#A1A1AA] hover:border-[#3F3F46] hover:text-[#D4D4D8]'
            )}
          >
            {selected ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export interface ChoiceCardProps {
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  icon?: ReactNode;
  badge?: string;
}

/** Large single-choice card used for "who is joining?" and the plan picker. */
export function ChoiceCard({
  title,
  description,
  selected,
  onSelect,
  icon,
  badge,
}: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'w-full rounded-2xl border p-4 text-left transition-[background-color,border-color,transform] duration-150 active:scale-[0.99]',
        selected
          ? 'border-[#E5B842]/60 bg-[#E5B842]/8'
          : 'border-[#27272A] bg-[#121214] hover:border-[#3F3F46]'
      )}
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <span
            className={cn(
              'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
              selected
                ? 'border-[#E5B842]/40 bg-[#E5B842]/12 text-[#F5D061]'
                : 'border-[#27272A] bg-[#18181B] text-[#71717A]'
            )}
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold tracking-tight text-[#F4F4F5]">
              {title}
            </span>
            {badge ? (
              <span className="rounded-full border border-[#E5B842]/30 bg-[#E5B842]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#F5D061]">
                {badge}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[12.5px] leading-snug text-[#71717A]">{description}</p>
        </div>
        <span
          aria-hidden
          className={cn(
            'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
            selected ? 'border-[#E5B842] bg-[#E5B842] text-[#09090B]' : 'border-[#3F3F46]'
          )}
        >
          {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
        </span>
      </div>
    </button>
  );
}

export interface YesNoProps {
  name: string;
  value: boolean | undefined;
  onChange: (value: boolean) => void;
  yesLabel?: string;
  noLabel?: string;
}

export function YesNo({ name, value, onChange, yesLabel = 'Yes', noLabel = 'No' }: YesNoProps) {
  const options = [
    { key: true, label: yesLabel },
    { key: false, label: noLabel },
  ];

  return (
    <div className="flex shrink-0 gap-1.5" role="group" aria-label={name}>
      {options.map((option) => {
        const selected = value === option.key;
        return (
          <button
            key={String(option.key)}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.key)}
            className={cn(
              'min-h-11 min-w-[58px] rounded-xl border px-3 text-[13px] font-medium transition-colors duration-150',
              selected
                ? option.key
                  ? 'border-[#F59E0B]/60 bg-[#F59E0B]/15 text-[#F59E0B]'
                  : 'border-[#10B981]/50 bg-[#10B981]/12 text-[#10B981]'
                : 'border-[#27272A] bg-[#121214] text-[#A1A1AA] hover:border-[#3F3F46]'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
}

/** Numeric stepper used for the family size - no typed digits, no dropdown. */
export function Stepper({ value, min, max, onChange, label }: StepperProps) {
  return (
    <div className="inline-flex items-center gap-3 rounded-2xl border border-[#27272A] bg-[#121214] p-1.5">
      <button
        type="button"
        aria-label={`Remove one person (${label})`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#18181B] text-[#D4D4D8] transition-colors hover:bg-[#27272A] disabled:opacity-40"
      >
        <Minus className="h-4 w-4" aria-hidden />
      </button>
      <span className="min-w-[76px] text-center text-[15px] font-semibold tabular-nums text-[#F4F4F5]">
        {value} {value === 1 ? 'person' : 'people'}
      </span>
      <button
        type="button"
        aria-label={`Add one person (${label})`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#18181B] text-[#D4D4D8] transition-colors hover:bg-[#27272A] disabled:opacity-40"
      >
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

export function CheckRow({
  checked,
  onChange,
  children,
  id,
  invalid,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  id?: string;
  invalid?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition-colors duration-150',
        invalid ? 'border-[#EF4444]/60' : 'border-[#27272A] hover:border-[#3F3F46]',
        checked ? 'bg-[#18181B]' : 'bg-[#121214]'
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
          checked ? 'border-[#E5B842] bg-[#E5B842] text-[#09090B]' : 'border-[#3F3F46]'
        )}
      >
        {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
      </span>
      <input
        id={id}
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.checked)}
      />
      <span className="text-[13.5px] leading-relaxed text-[#D4D4D8]">{children}</span>
    </label>
  );
}

export function InfoNote({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'warning' }) {
  return (
    <p
      className={cn(
        'rounded-2xl border px-3.5 py-3 text-[12.5px] leading-relaxed',
        tone === 'warning'
          ? 'border-[#F59E0B]/30 bg-[#F59E0B]/8 text-[#F5D061]'
          : 'border-[#27272A] bg-[#121214] text-[#A1A1AA]'
      )}
    >
      {children}
    </p>
  );
}

export function SectionCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-3xl border border-[#27272A] bg-[#121214] p-4 sm:p-5',
        className
      )}
    >
      <header className="mb-4">
        <h2 className="text-[15px] font-semibold tracking-tight text-[#F4F4F5]">{title}</h2>
        {description ? (
          <p className="mt-1 text-[12.5px] leading-snug text-[#71717A]">{description}</p>
        ) : null}
      </header>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

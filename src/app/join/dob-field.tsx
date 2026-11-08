'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ageFromDob } from './form-state';
import { FieldError } from './fields';

/**
 * Stepped date-of-birth entry: year, then month, then day.
 *
 * No native `<input type="date">` (its picker is unusable for a birth date on
 * a phone): the year is a compact select, the month and day are chip grids
 * that unlock in order. Values are emitted as `YYYY-MM-DD`.
 */

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const MIN_AGE = 8;
const MAX_AGE = 110;

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function pad(value: number | string): string {
  return String(value).padStart(2, '0');
}

export interface DobFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  optional?: boolean;
  hint?: ReactNode;
}

export function DobField({
  id,
  label,
  value,
  onChange,
  error,
  required,
  optional,
  hint,
}: DobFieldProps) {
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [syncedValue, setSyncedValue] = useState(value);

  // Keep local steps in sync when the form is reset or pre-filled externally.
  if (syncedValue !== value) {
    setSyncedValue(value);
    const [nextYear = '', nextMonth = '', nextDay = ''] = value ? value.split('-') : [];
    setYear(nextYear ? String(Number(nextYear)) : '');
    setMonth(nextMonth ? String(Number(nextMonth)) : '');
    setDay(nextDay ? String(Number(nextDay)) : '');
  }

  const currentYear = new Date().getFullYear();
  const years = useMemo(() => {
    const list: number[] = [];
    for (let candidate = currentYear - MIN_AGE; candidate >= currentYear - MAX_AGE; candidate -= 1) {
      list.push(candidate);
    }
    return list;
  }, [currentYear]);

  const dayCount = year && month ? daysInMonth(Number(year), Number(month)) : 31;
  const composed =
    year && month && day ? `${year}-${pad(month)}-${pad(day)}` : '';
  const age = ageFromDob(composed);

  function emit(nextYear: string, nextMonth: string, nextDay: string) {
    if (!nextYear || !nextMonth || !nextDay) {
      onChange('');
      return;
    }
    const clampedDay = Math.min(Number(nextDay), daysInMonth(Number(nextYear), Number(nextMonth)));
    onChange(`${nextYear}-${pad(nextMonth)}-${pad(clampedDay)}`);
  }

  const errorId = error ? `${id}-error` : undefined;
  const stepLabel = 'text-[11px] font-medium uppercase tracking-wide text-[#71717A]';

  return (
    <div className="flex flex-col gap-2.5">
      <span className="flex items-baseline gap-1.5 text-[13px] font-medium text-[#D4D4D8]">
        <span>{label}</span>
        {required ? (
          <span aria-hidden className="text-[#E5B842]">
            *
          </span>
        ) : null}
        {optional ? (
          <span className="text-[11px] font-normal text-[#71717A]">Optional</span>
        ) : null}
      </span>

      <div
        className={cn(
          'flex flex-col gap-3 rounded-2xl border p-3.5 transition-colors',
          error ? 'border-[#EF4444]/60' : 'border-[#27272A] bg-[#121214]'
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="relative">
            <span className={stepLabel}>1 · Year</span>
            <div className="relative mt-1.5">
              <select
                id={id}
                value={year}
                aria-label="Year of birth"
                aria-invalid={error ? true : undefined}
                aria-describedby={errorId}
                onChange={(event) => {
                  const nextYear = event.target.value;
                  setYear(nextYear);
                  const clampedDay =
                    nextYear && month && day
                      ? Math.min(Number(day), daysInMonth(Number(nextYear), Number(month)))
                      : Number(day || 0);
                  setDay(clampedDay ? String(clampedDay) : '');
                  emit(nextYear, month, clampedDay ? String(clampedDay) : '');
                }}
                className="h-12 w-[132px] appearance-none rounded-2xl border border-[#27272A] bg-[#09090B] pl-4 pr-9 text-[15px] tabular-nums text-[#F4F4F5] outline-none focus:border-[#E5B842]/70"
              >
                <option value="">Select</option>
                {years.map((candidate) => (
                  <option key={candidate} value={candidate}>
                    {candidate}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]"
                aria-hidden
              />
            </div>
          </div>

          {age !== null && !error ? (
            <div className="rounded-2xl border border-[#27272A] bg-[#09090B] px-3 py-2 text-right">
              <span className="block text-[10px] uppercase tracking-wide text-[#71717A]">Age</span>
              <span className="text-[15px] font-semibold tabular-nums text-[#F5D061]">{age}</span>
            </div>
          ) : null}
        </div>

        <div>
          <span className={stepLabel}>2 · Month</span>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {MONTHS.map((name, index) => {
              const monthValue = index + 1;
              const selected = month === String(monthValue);
              return (
                <button
                  key={name}
                  type="button"
                  disabled={!year}
                  aria-pressed={selected}
                  onClick={() => {
                    const nextMonth = String(monthValue);
                    setMonth(nextMonth);
                    const clamped = day
                      ? Math.min(Number(day), daysInMonth(Number(year), monthValue))
                      : 0;
                    setDay(clamped ? String(clamped) : day);
                    emit(year, nextMonth, clamped ? String(clamped) : day);
                  }}
                  className={cn(
                    'min-h-11 rounded-xl border text-[13px] transition-colors duration-150 disabled:opacity-35',
                    selected
                      ? 'border-[#E5B842]/60 bg-[#E5B842]/12 text-[#F5D061]'
                      : 'border-[#27272A] bg-[#09090B] text-[#A1A1AA] hover:border-[#3F3F46]'
                  )}
                >
                  {name.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className={stepLabel}>3 · Day</span>
          <div className="mt-1.5 grid grid-cols-7 gap-1.5">
            {Array.from({ length: dayCount }, (_, index) => index + 1).map((dayValue) => {
              const selected = day === String(dayValue);
              return (
                <button
                  key={dayValue}
                  type="button"
                  disabled={!year || !month}
                  aria-pressed={selected}
                  aria-label={`Day ${dayValue}`}
                  onClick={() => {
                    const nextDay = String(dayValue);
                    setDay(nextDay);
                    emit(year, month, nextDay);
                  }}
                  className={cn(
                    'min-h-11 rounded-xl border text-[13px] tabular-nums transition-colors duration-150 disabled:opacity-35',
                    selected
                      ? 'border-[#E5B842]/60 bg-[#E5B842]/12 text-[#F5D061]'
                      : 'border-[#27272A] bg-[#09090B] text-[#A1A1AA] hover:border-[#3F3F46]'
                  )}
                >
                  {dayValue}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {hint && !error ? <p className="text-[12px] text-[#71717A]">{hint}</p> : null}
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

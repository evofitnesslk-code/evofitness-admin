'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { getExampleNumber, type CountryCode } from 'libphonenumber-js';
import mobileExamples from 'libphonenumber-js/examples.mobile.json';
import { listPhoneCountries, parsePhone, type PhoneCountry } from '@/lib/phone';
import { cn } from '@/lib/utils';
import { FieldError } from './fields';

/**
 * Mobile phone entry: a country chip that opens a searchable sheet, plus a
 * national-number input that reports validity as you type. Values are stored
 * as typed and converted to E.164 on submit.
 */

const INPUT_CLASS =
  'h-12 w-full rounded-2xl border bg-[#121214] px-4 text-[15px] text-[#F4F4F5] ' +
  'placeholder:text-[#52525B] outline-none transition-colors duration-150 ' +
  'focus:bg-[#18181B] focus:border-[#E5B842]/70 focus:ring-2 focus:ring-[#E5B842]/15';

function exampleFor(country: CountryCode): string {
  try {
    const example = getExampleNumber(country, mobileExamples);
    if (!example) return '';
    return example.formatNational().replace(/[^\d\s]/g, '').trim();
  } catch {
    return '';
  }
}

export interface PhoneFieldProps {
  id: string;
  label: string;
  value: string;
  country: CountryCode;
  onValueChange: (value: string) => void;
  onCountryChange: (country: CountryCode) => void;
  error?: string;
  required?: boolean;
  optional?: boolean;
  hint?: ReactNode;
  autoComplete?: string;
}

export function PhoneField({
  id,
  label,
  value,
  country,
  onValueChange,
  onCountryChange,
  error,
  required,
  optional,
  hint,
  autoComplete = 'tel',
}: PhoneFieldProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const countries = useMemo(() => listPhoneCountries(), []);
  const active = useMemo(
    () => countries.find((entry) => entry.code === country) ?? countries[0],
    [countries, country]
  );
  const parsed = useMemo(() => parsePhone(value, country), [value, country]);
  const example = useMemo(() => exampleFor(country), [country]);
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="flex items-baseline gap-1.5 text-[13px] font-medium text-[#D4D4D8]"
      >
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

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label={`Change country code, currently ${active.dial} (${active.name})`}
          className="flex h-12 shrink-0 items-center gap-1.5 rounded-2xl border border-[#27272A] bg-[#121214] px-3 text-[14px] text-[#D4D4D8] transition-colors hover:border-[#3F3F46]"
        >
          <span className="tabular-nums text-[#F4F4F5]">{active.dial}</span>
          <ChevronDown className="h-3.5 w-3.5 text-[#71717A]" aria-hidden />
        </button>

        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          placeholder={example || '77 123 4567'}
          className={cn(INPUT_CLASS, error ? 'border-[#EF4444]/70' : 'border-[#27272A]')}
        />
      </div>

      {error ? (
        <FieldError id={errorId}>{error}</FieldError>
      ) : parsed.valid ? (
        <p className="flex items-center gap-1.5 text-[12px] text-[#10B981]">
          <Check className="h-3.5 w-3.5" aria-hidden />
          <span className="tabular-nums">{parsed.e164}</span>
        </p>
      ) : hint ? (
        <p className="text-[12px] leading-snug text-[#71717A]">{hint}</p>
      ) : null}

      <CountrySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        countries={countries}
        selected={country}
        onSelect={(code) => {
          onCountryChange(code);
          setSheetOpen(false);
        }}
      />
    </div>
  );
}

interface CountrySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  countries: PhoneCountry[];
  selected: CountryCode;
  onSelect: (code: CountryCode) => void;
}

export function CountrySheet({
  open,
  onOpenChange,
  countries,
  selected,
  onSelect,
}: CountrySheetProps) {
  const [query, setQuery] = useState('');
  const [syncedOpen, setSyncedOpen] = useState(open);
  const searchRef = useRef<HTMLInputElement>(null);
  const dialogId = useId();

  // Clear the previous search as the sheet opens (render-time reset).
  if (syncedOpen !== open) {
    setSyncedOpen(open);
    if (open) setQuery('');
  }

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return countries;
    return countries.filter(
      (entry) =>
        entry.name.toLowerCase().includes(needle) ||
        entry.dial.replace('+', '').startsWith(needle.replace('+', '')) ||
        entry.code.toLowerCase() === needle
    );
  }, [countries, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close country picker"
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 animate-fade-in bg-black/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Select country"
        id={dialogId}
        className="animate-rise-in relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl border border-[#27272A] bg-[#121214] sm:max-w-md sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-[#27272A] px-4 py-3">
          <h3 className="text-[15px] font-semibold text-[#F4F4F5]">Country code</h3>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#18181B] text-[#A1A1AA] transition-colors hover:bg-[#27272A] hover:text-[#F4F4F5]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="border-b border-[#27272A] p-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717A]"
              aria-hidden
            />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search country or code"
              aria-label="Search country"
              className="h-11 w-full rounded-2xl border border-[#27272A] bg-[#09090B] pl-9 pr-3 text-[14px] text-[#F4F4F5] placeholder:text-[#52525B] outline-none focus:border-[#E5B842]/60"
            />
          </div>
        </div>

        <ul className="flex-1 overflow-y-auto overscroll-contain px-2 py-2">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-[13px] text-[#71717A]">
              No country matches “{query}”.
            </li>
          ) : (
            filtered.map((entry) => {
              const isSelected = entry.code === selected;
              return (
                <li key={entry.code}>
                  <button
                    type="button"
                    onClick={() => onSelect(entry.code)}
                    className={cn(
                      'flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-3 text-left transition-colors',
                      isSelected ? 'bg-[#E5B842]/10' : 'hover:bg-[#18181B]'
                    )}
                  >
                    <span className="truncate text-[14px] text-[#F4F4F5]">{entry.name}</span>
                    <span className="flex items-center gap-2">
                      <span className="tabular-nums text-[13px] text-[#A1A1AA]">{entry.dial}</span>
                      {isSelected ? (
                        <Check className="h-4 w-4 text-[#E5B842]" aria-hidden />
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}

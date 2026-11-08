import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';

/**
 * Phone number handling for the public application form.
 *
 * Numbers are captured with a country selector and stored in E.164
 * (`+94771234567`), so the same applicant always matches the same record no
 * matter how the number was typed. Sri Lanka is the default country.
 */
export const DEFAULT_PHONE_COUNTRY: CountryCode = 'LK';

export interface PhoneCountry {
  code: CountryCode;
  name: string;
  dial: string;
}

let cachedCountries: PhoneCountry[] | null = null;

/** Country list for the picker: Sri Lanka first, then everything alphabetical. */
export function listPhoneCountries(): PhoneCountry[] {
  if (cachedCountries) return cachedCountries;

  let display: Intl.DisplayNames | null = null;
  try {
    display = new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    display = null;
  }

  const countries = getCountries().map((code) => ({
    code,
    name: display?.of(code) ?? code,
    dial: `+${getCountryCallingCode(code)}`,
  }));

  countries.sort((a, b) => {
    if (a.code === DEFAULT_PHONE_COUNTRY) return -1;
    if (b.code === DEFAULT_PHONE_COUNTRY) return 1;
    return a.name.localeCompare(b.name);
  });

  cachedCountries = countries;
  return countries;
}

export interface ParsedPhone {
  /** E.164 value, or null when the input cannot be interpreted at all. */
  e164: string | null;
  /** True when the number is a valid, dialable number for that country. */
  valid: boolean;
  /** Human readable national/international format. */
  formatted: string;
}

export function parsePhone(value: string, country: CountryCode): ParsedPhone {
  const raw = (value ?? '').trim();
  if (!raw) return { e164: null, valid: false, formatted: '' };

  const parsed = parsePhoneNumberFromString(raw, country);
  if (!parsed) return { e164: null, valid: false, formatted: raw };

  return {
    e164: parsed.number,
    valid: parsed.isValid(),
    formatted: parsed.country === country ? parsed.formatNational() : parsed.formatInternational(),
  };
}

/**
 * Loose comparison key for "is this the same number" checks.
 *
 * Historical records hold local numbers (`0771234567`), new submissions hold
 * E.164 (`+94771234567`); comparing the last 9 digits treats both as equal.
 */
export function phoneMatchKey(value: string | null | undefined): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length < 9) return digits;
  return digits.slice(-9);
}

/** Display helper: E.164 in, `+94 77 123 4567` out. */
export function formatPhoneInternational(value: string | null | undefined): string {
  if (!value) return '';
  const parsed = parsePhoneNumberFromString(value);
  return parsed ? parsed.formatInternational() : value;
}

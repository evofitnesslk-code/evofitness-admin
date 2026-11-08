import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatLKR(amount: number): string {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
    .format(amount)
    .replace("LKR", "LKR ");
}

export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return "-";
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Whole-year age for a date of birth (`YYYY-MM-DD`), relative to `reference`
 * (defaults to now). Returns null when the value is missing or unparsable.
 */
export function calculateAge(
  dateOfBirth: string | Date | null | undefined,
  reference: Date = new Date()
): number | null {
  if (!dateOfBirth) return null;
  const birth =
    typeof dateOfBirth === "string" ? new Date(`${dateOfBirth}T00:00:00Z`) : dateOfBirth;
  const ms = birth.getTime();
  if (Number.isNaN(ms)) return null;
  const age = (reference.getTime() - ms) / (1000 * 60 * 60 * 24 * 365.25);
  if (age < 0) return null;
  return Math.floor(age);
}

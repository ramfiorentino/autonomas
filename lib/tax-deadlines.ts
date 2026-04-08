/**
 * Modelo 130 quarterly deadlines (Spanish IRPF for autónomos).
 *
 * Deadlines are fixed by Spanish law:
 *   Q1 → 20 April
 *   Q2 → 20 July
 *   Q3 → 20 October
 *   Q4 → 30 January (following year)
 */

export interface TaxDeadline {
  label: string; // e.g. "Q1 Modelo 130"
  /** ISO date string YYYY-MM-DD */
  date: string;
  /** Day of the month the deadline falls on */
  day: number;
}

// month is 1-indexed (1 = January)
const DEADLINE_MAP: Record<number, { day: number; quarter: number }> = {
  4:  { day: 20, quarter: 1 },
  7:  { day: 20, quarter: 2 },
  10: { day: 20, quarter: 3 },
  1:  { day: 30, quarter: 4 },
};

/**
 * Returns the Modelo 130 deadline for the given month (1-indexed),
 * or null if this month contains no deadline.
 *
 * @param month - 1-indexed month number (1 = January, 12 = December)
 * @param year  - full year (e.g. 2026); needed to construct the ISO date string.
 *                Defaults to the current year, with Q4 (January) using the
 *                current year (deadline is in January of a new year, filed for
 *                the prior year's Q4).
 */
export function getDeadlineForMonth(
  month: number,
  year: number = new Date().getFullYear(),
): TaxDeadline | null {
  const entry = DEADLINE_MAP[month];
  if (!entry) return null;

  const monthStr = String(month).padStart(2, "0");
  const dayStr = String(entry.day).padStart(2, "0");

  return {
    label: `Q${entry.quarter} Modelo 130`,
    date: `${year}-${monthStr}-${dayStr}`,
    day: entry.day,
  };
}

/**
 * Returns the number of days remaining from a given reference date until
 * the deadline day in the specified month/year.
 *
 * Used in emails to show "X days remaining" from the 1st of the month.
 *
 * @param deadlineDay   - day of the month the deadline falls on
 * @param month         - 1-indexed month
 * @param year          - full year
 * @param referenceDate - the date to count from (defaults to today)
 */
export function daysRemaining(
  deadlineDay: number,
  month: number,
  year: number,
  referenceDate: Date = new Date(),
): number {
  const deadline = new Date(year, month - 1, deadlineDay);
  const ref = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );
  const ms = deadline.getTime() - ref.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

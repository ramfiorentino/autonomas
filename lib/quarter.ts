export type Quarter = 1 | 2 | 3 | 4;

export interface QuarterInfo {
  year: number;
  quarter: Quarter;
  start: Date;
  end: Date;
}

export interface QuarterBounds {
  start: Date;
  end: Date;
}

export interface DeadlineInfo {
  label: string;
  date: Date;
  daysRemaining: number;
}

export type DeadlineUrgency = "neutral" | "warning" | "critical";

/**
 * Returns the quarter (1–4) for a given month (0-indexed).
 */
function monthToQuarter(month: number): Quarter {
  return (Math.floor(month / 3) + 1) as Quarter;
}

/**
 * Returns bounds for a given year and quarter.
 */
export function getQuarterBounds(year: number, quarter: Quarter): QuarterBounds {
  const startMonth = (quarter - 1) * 3;
  const endMonth = startMonth + 2;
  const start = new Date(year, startMonth, 1);
  // Last day of end month
  const end = new Date(year, endMonth + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Returns quarter info for the current date.
 */
export function getCurrentQuarter(): QuarterInfo {
  const now = new Date();
  const year = now.getFullYear();
  const quarter = monthToQuarter(now.getMonth());
  const { start, end } = getQuarterBounds(year, quarter);
  return { year, quarter, start, end };
}

/**
 * Hardcoded Modelo 130 quarterly deadlines:
 *   Q1 → 20 April
 *   Q2 → 20 July
 *   Q3 → 20 October
 *   Q4 → 30 January (following year)
 *
 * V2 note: does not account for public holidays.
 */
const DEADLINES: Array<{ month: number; day: number; quarter: Quarter }> = [
  { month: 3, day: 20, quarter: 1 },  // April 20
  { month: 6, day: 20, quarter: 2 },  // July 20
  { month: 9, day: 20, quarter: 3 },  // October 20
  { month: 0, day: 30, quarter: 4 },  // January 30
];

/**
 * Returns the next upcoming Modelo 130 deadline relative to today.
 */
export function getNextDeadline(): DeadlineInfo {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const year = now.getFullYear();

  // Find the next deadline that hasn't passed yet
  for (const d of DEADLINES.slice(0, 3)) {
    const deadline = new Date(year, d.month, d.day);
    if (deadline >= today) {
      const ms = deadline.getTime() - today.getTime();
      const daysRemaining = Math.ceil(ms / (1000 * 60 * 60 * 24));
      return {
        label: `q${d.quarter}` as string,
        date: deadline,
        daysRemaining,
      };
    }
  }

  // Q4 deadline is January 30 of the following year
  const q4Deadline = new Date(year + 1, 0, 30);
  const ms = q4Deadline.getTime() - today.getTime();
  const daysRemaining = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return { label: "q4", date: q4Deadline, daysRemaining };
}

/**
 * Returns urgency level based on days remaining.
 *   > 30  → "neutral"
 *   8–30  → "warning"
 *   ≤ 7   → "critical"
 */
export function getDeadlineUrgency(daysRemaining: number): DeadlineUrgency {
  if (daysRemaining <= 7) return "critical";
  if (daysRemaining <= 30) return "warning";
  return "neutral";
}

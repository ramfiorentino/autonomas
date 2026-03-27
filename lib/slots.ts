import type { AvailabilityRule, Booking, TimeSlot, WorkingHours } from "@/lib/types/booking";

const DAY_KEYS: (keyof AvailabilityRule["weekdays"])[] = [
  "sun", "mon", "tue", "wed", "thu", "fri", "sat",
];

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Generates all theoretical slots for a given date based on working hours and slot duration.
 * Returns [] if the day is disabled or blocked.
 */
export function generateSlots(
  rules: AvailabilityRule,
  date: string, // "YYYY-MM-DD"
): TimeSlot[] {
  // Check blocked dates
  if (rules.blockedDates.includes(date)) return [];

  const dayOfWeek = new Date(date + "T12:00:00").getDay(); // 0=Sun
  const dayKey = DAY_KEYS[dayOfWeek];
  const hours: WorkingHours = rules.weekdays[dayKey];

  if (!hours.enabled) return [];

  const fromMin = timeToMinutes(hours.from);
  const toMin = timeToMinutes(hours.to);
  const duration = rules.slotDuration;

  const slots: TimeSlot[] = [];
  for (let start = fromMin; start + duration <= toMin; start += duration) {
    slots.push({
      start: minutesToTime(start),
      end: minutesToTime(start + duration),
    });
  }
  return slots;
}

/**
 * Subtracts already-booked slots from the theoretical slot list.
 * Returns only slots that are still available.
 */
export function subtractBooked(
  slots: TimeSlot[],
  bookings: Booking[],
  date: string,
): TimeSlot[] {
  const bookedStarts = new Set(
    bookings
      .filter((b) => b.date === date && b.status !== "cancelled")
      .map((b) => b.slot.start),
  );
  return slots.filter((s) => !bookedStarts.has(s.start));
}

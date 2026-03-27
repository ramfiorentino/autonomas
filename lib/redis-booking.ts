import { redis } from "@/lib/kv";
import type { AvailabilityRule, Booking, BookingStatus } from "@/lib/types/booking";

const availabilityKey = (userId: string) => `availability:${userId}`;
const bookingsKey = (userId: string, yearMonth: string) =>
  `bookings:${userId}:${yearMonth}`;

export async function getAvailability(
  userId: string,
): Promise<AvailabilityRule | null> {
  return redis.get<AvailabilityRule>(availabilityKey(userId));
}

export async function setAvailability(
  userId: string,
  rules: AvailabilityRule,
): Promise<void> {
  await redis.set(availabilityKey(userId), rules);
}

export async function getBookings(
  userId: string,
  yearMonth: string, // "YYYY-MM"
): Promise<Booking[]> {
  const data = await redis.get<Booking[]>(bookingsKey(userId, yearMonth));
  return data ?? [];
}

export async function addBooking(
  userId: string,
  booking: Booking,
): Promise<{ success: boolean; conflict: boolean }> {
  const yearMonth = booking.date.slice(0, 7);
  const key = bookingsKey(userId, yearMonth);

  // Read current bookings
  const current = await redis.get<Booking[]>(key) ?? [];

  // Conflict check: any non-cancelled booking on same date + slot start
  const conflict = current.some(
    (b) =>
      b.date === booking.date &&
      b.slot.start === booking.slot.start &&
      b.status !== "cancelled",
  );

  if (conflict) return { success: false, conflict: true };

  const updated = [...current, booking];
  await redis.set(key, updated);
  return { success: true, conflict: false };
}

export async function updateBookingStatus(
  userId: string,
  bookingId: string,
  status: BookingStatus,
  extra?: Partial<Booking>,
): Promise<void> {
  // Scan last 3 months (bookings may span month boundaries)
  const now = new Date();
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yearMonth = `${d.getFullYear()}-${mm}`;
    const key = bookingsKey(userId, yearMonth);

    const bookings = await redis.get<Booking[]>(key) ?? [];
    const idx = bookings.findIndex((b) => b.id === bookingId);
    if (idx === -1) continue;

    bookings[idx] = { ...bookings[idx], status, ...extra };
    await redis.set(key, bookings);
    return;
  }
}

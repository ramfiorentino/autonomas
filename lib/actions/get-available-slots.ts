"use server";

import { getAvailability, getBookings } from "@/lib/redis-booking";
import { generateSlots, subtractBooked } from "@/lib/slots";
import type { TimeSlot } from "@/lib/types/booking";

export async function getAvailableSlots(
  userId: string,
  date: string, // "YYYY-MM-DD"
): Promise<TimeSlot[]> {
  const [rules, bookings] = await Promise.all([
    getAvailability(userId),
    getBookings(userId, date.slice(0, 7)),
  ]);

  if (!rules) return [];

  const theoretical = generateSlots(rules, date);
  return subtractBooked(theoretical, bookings, date);
}

/** Returns a set of dates (YYYY-MM-DD) that have at least one available slot */
export async function getAvailableDates(
  userId: string,
  year: number,
  month: number, // 1-12
): Promise<string[]> {
  const yearMonth = `${year}-${String(month).padStart(2, "0")}`;
  const [rules, bookings] = await Promise.all([
    getAvailability(userId),
    getBookings(userId, yearMonth),
  ]);

  if (!rules) return [];

  const daysInMonth = new Date(year, month, 0).getDate();
  const available: string[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    // Skip past dates
    if (new Date(date) < new Date(new Date().toDateString())) continue;
    const slots = generateSlots(rules, date);
    const free = subtractBooked(slots, bookings, date);
    if (free.length > 0) available.push(date);
  }

  return available;
}

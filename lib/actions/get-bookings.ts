"use server";

import { auth } from "@/auth";
import { getBookings } from "@/lib/redis-booking";
import type { Booking } from "@/lib/types/booking";

export async function getBookingsForCitasTab(): Promise<Booking[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  const userId = session.user.id;
  const now = new Date();

  // Load current + previous month
  const months: string[] = [];
  for (let i = -1; i <= 1; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    months.push(`${d.getFullYear()}-${mm}`);
  }

  const results = await Promise.all(
    months.map((ym) => getBookings(userId, ym)),
  );

  return results
    .flat()
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
}

export async function cancelBooking(bookingId: string): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false };

  const { updateBookingStatus } = await import("@/lib/redis-booking");
  await updateBookingStatus(session.user.id, bookingId, "cancelled");
  return { success: true };
}

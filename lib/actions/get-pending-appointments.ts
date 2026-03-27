"use server";

import { auth } from "@/auth";
import { redis } from "@/lib/kv";

export interface PendingAppointment {
  id: string;
  patientName: string;
  dateTime: string;
  appointmentType: string;
  status: string;
}

export interface PendingAppointmentsResult {
  appointments: PendingAppointment[];
  hasMore: boolean;
}

/**
 * Returns booked appointments (not yet invoiced) for the current user,
 * sorted by date ascending, limited to 5 (with hasMore if more exist).
 *
 * Keys follow the pattern: bookings:{userId}:{YYYY-MM}
 * Returns empty list gracefully if no bookings exist yet (booking feature not yet shipped).
 */
export async function getPendingAppointments(): Promise<PendingAppointmentsResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { appointments: [], hasMore: false };
  }

  const userId = session.user.id;

  try {
    // Scan for all booking keys for this user
    const now = new Date();
    const months: string[] = [];
    // Check current month and next 2 months for upcoming appointments
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      months.push(`bookings:${userId}:${d.getFullYear()}-${mm}`);
    }

    const results = await Promise.all(
      months.map((key) => redis.lrange<PendingAppointment>(key, 0, -1)),
    );

    const allBooked = results
      .flat()
      .filter((a) => a && a.status === "booked")
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

    const hasMore = allBooked.length > 5;
    return {
      appointments: allBooked.slice(0, 5),
      hasMore,
    };
  } catch {
    return { appointments: [], hasMore: false };
  }
}

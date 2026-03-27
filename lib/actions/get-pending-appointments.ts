"use server";

import { auth } from "@/auth";
import { getBookings } from "@/lib/redis-booking";

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

const LIMIT = 6;

export async function getPendingAppointments(): Promise<PendingAppointmentsResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { appointments: [], hasMore: false };
  }

  const userId = session.user.id;

  try {
    const now = new Date();
    const months: string[] = [];
    // Current month + next 2 months for upcoming pending appointments
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      months.push(`${d.getFullYear()}-${mm}`);
    }

    const results = await Promise.all(
      months.map((ym) => getBookings(userId, ym)),
    );

    const pending = results
      .flat()
      .filter((b) => b.status === "pending")
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

    const hasMore = pending.length > LIMIT;
    return {
      appointments: pending.slice(0, LIMIT).map((b) => ({
        id: b.id,
        patientName: b.patientName,
        dateTime: b.dateTime,
        appointmentType: b.appointmentType,
        status: b.status,
      })),
      hasMore,
    };
  } catch {
    return { appointments: [], hasMore: false };
  }
}

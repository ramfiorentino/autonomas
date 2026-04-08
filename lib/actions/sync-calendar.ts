"use server";

import { auth } from "@/auth";
import { getBookings, updateBookingStatus } from "@/lib/redis-booking";
import type { Booking, TimeSlot } from "@/lib/types/booking";

async function createCalendarEvent(
  accessToken: string,
  doctorName: string,
  booking: Booking,
): Promise<string | null> {
  const { date, slot, patientName, patientEmail, patientNif } = booking;
  const startDateTime = `${date}T${slot.start}:00`;
  const endDateTime = `${date}T${slot.end}:00`;

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientEmail);

  const event = {
    summary: `Consulta — ${patientName}`,
    description: [patientEmail, patientNif ? `NIF: ${patientNif}` : null]
      .filter(Boolean)
      .join("\n"),
    start: { dateTime: startDateTime, timeZone: "Europe/Madrid" },
    end: { dateTime: endDateTime, timeZone: "Europe/Madrid" },
    ...(isValidEmail ? { attendees: [{ email: patientEmail }] } : {}),
    conferenceData: {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    },
  );

  if (!res.ok) return null;
  const data = await res.json();
  return data.id ?? null;
}

/**
 * Creates Google Calendar events for all pending bookings with calendarError: true.
 * Returns the updated bookings so the UI can reflect the change without refetching.
 */
export async function syncCalendarErrors(): Promise<Booking[]> {
  const session = await auth();
  if (!session?.user?.id || !session?.access_token) return [];

  const userId = session.user.id;
  const accessToken = session.access_token;
  const doctorName = session.user.name ?? userId;

  // Scan same months as the Citas tab (prev, current, next)
  const now = new Date();
  const months: string[] = [];
  for (let i = -1; i <= 1; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    months.push(`${d.getFullYear()}-${mm}`);
  }

  const results = await Promise.all(months.map((ym) => getBookings(userId, ym)));
  const allBookings = results.flat();

  const errored = allBookings.filter(
    (b) => b.calendarError && b.status === "pending",
  );

  if (errored.length === 0) return [];

  const updated: Booking[] = [];

  for (const booking of errored) {
    const eventId = await createCalendarEvent(accessToken, doctorName, booking);
    if (eventId) {
      await updateBookingStatus(userId, booking.id, "pending", {
        calendarError: false,
        calendarEventId: eventId,
      });
      updated.push({ ...booking, calendarError: false, calendarEventId: eventId });
    }
  }

  return updated;
}

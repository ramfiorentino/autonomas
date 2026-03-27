import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { addBooking, getAvailability, updateBookingStatus } from "@/lib/redis-booking";
import { upsertPatient } from "@/lib/redis-patients";
import { resolveSlug } from "@/lib/redis-slug";
import type { Booking, TimeSlot } from "@/lib/types/booking";

interface BookingRequest {
  userId: string;
  date: string;
  slot: TimeSlot;
  patient: { name: string; email: string; nif: string | null };
  lang: "es" | "en";
}

async function createCalendarEvent(
  accessToken: string,
  patient: { name: string; email: string; nif: string | null },
  date: string,
  slot: TimeSlot,
  doctorName: string,
): Promise<string | null> {
  const startDateTime = `${date}T${slot.start}:00`;
  const endDateTime = `${date}T${slot.end}:00`;

  const event = {
    summary: `Consulta — ${patient.name}`,
    description: [
      patient.email,
      patient.nif ? `NIF: ${patient.nif}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    start: { dateTime: startDateTime, timeZone: "Europe/Madrid" },
    end: { dateTime: endDateTime, timeZone: "Europe/Madrid" },
    attendees: [{ email: patient.email }],
  };

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
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

async function sendConfirmationEmail(
  patient: { name: string; email: string },
  doctorName: string,
  date: string,
  slot: TimeSlot,
  lang: "es" | "en",
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const subject =
    lang === "es"
      ? `Cita confirmada con ${doctorName}`
      : `Appointment confirmed with ${doctorName}`;

  const body =
    lang === "es"
      ? `Hola ${patient.name},\n\nTu cita ha sido confirmada.\n\nFecha: ${date}\nHora: ${slot.start}\nMédico: ${doctorName}\n\nHasta pronto.`
      : `Hi ${patient.name},\n\nYour appointment has been confirmed.\n\nDate: ${date}\nTime: ${slot.start}\nDoctor: ${doctorName}\n\nSee you soon.`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "noreply@autonomas.app",
        to: patient.email,
        subject,
        text: body,
      }),
    });
  } catch {
    // Email failures are non-blocking — log silently
    console.error("[booking] Resend email failed");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BookingRequest;
    const { userId, date, slot, patient, lang } = body;

    if (!userId || !date || !slot || !patient?.name || !patient?.email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Build booking record
    const booking: Booking = {
      id: nanoid(),
      userId,
      patientName: patient.name,
      patientEmail: patient.email,
      patientNif: patient.nif,
      slot,
      date,
      dateTime: `${date}T${slot.start}:00`,
      appointmentType: "Consulta",
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    // Atomic-ish conflict check + write
    const result = await addBooking(userId, booking);
    if (result.conflict) {
      return NextResponse.json({ error: "slot_conflict" }, { status: 409 });
    }

    // Google Calendar event (non-blocking)
    // Note: on the public booking route there's no doctor OAuth token available.
    // Calendar event creation requires the doctor's token, which is stored in their session.
    // V1 limitation: Calendar event is created when the doctor opens the Citas tab.
    // The calendarError flag is set to true until the event is created.
    booking.calendarError = true;

    // Update the booking record with calendarError flag
    await updateBookingStatus(userId, booking.id, "pending", { calendarError: true });

    // Upsert patient directory
    await upsertPatient(userId, patient).catch(() => {
      // Patient upsert failure is non-blocking
      console.error("[booking] Patient upsert failed");
    });

    // Send confirmation email (non-blocking)
    // We don't have the doctor's display name readily available here — use userId as fallback
    await sendConfirmationEmail(patient, userId, date, slot, lang);

    return NextResponse.json({ success: true, booking });
  } catch (err) {
    console.error("[booking] POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookingCalendar } from "@/components/booking/BookingCalendar";
import { SlotGrid } from "@/components/booking/SlotGrid";
import { PatientForm } from "@/components/booking/PatientForm";
import type { TimeSlot } from "@/lib/types/booking";
import { CheckCircle } from "lucide-react";

interface BookingPageClientProps {
  slug: string;
  userId: string;
  doctorName: string;
  doctorTitle: string;
  initialLang: "es" | "en";
}

const T = {
  es: {
    title: "Reservar cita",
    selectDate: "1. Selecciona una fecha",
    selectSlot: "2. Selecciona una hora",
    patientDetails: "3. Tus datos",
    confirmed: "¡Cita confirmada!",
    confirmedSub: "Hemos enviado la confirmación a tu correo",
    doctor: "Médico",
    date: "Fecha",
    time: "Hora",
  },
  en: {
    title: "Book appointment",
    selectDate: "1. Select a date",
    selectSlot: "2. Select a time",
    patientDetails: "3. Your details",
    confirmed: "Appointment confirmed!",
    confirmedSub: "We have sent a confirmation to your email",
    doctor: "Doctor",
    date: "Date",
    time: "Time",
  },
};

export function BookingPageClient({
  slug,
  userId,
  doctorName,
  doctorTitle,
  initialLang,
}: BookingPageClientProps) {
  const router = useRouter();
  const [lang, setLang] = useState<"es" | "en">(initialLang);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [confirmed, setConfirmed] = useState<{
    patientName: string;
    date: string;
    slot: TimeSlot;
  } | null>(null);

  const copy = T[lang];

  function switchLang(l: "es" | "en") {
    setLang(l);
    // Set cookie + update URL
    document.cookie = `booking-lang=${l}; path=/; max-age=31536000`;
    const url = new URL(window.location.href);
    url.searchParams.set("lang", l);
    router.replace(url.toString());
  }

  if (confirmed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">{copy.confirmed}</h1>
          <p className="text-muted-foreground">{copy.confirmedSub}</p>
          <div className="rounded-card border border-border bg-surface p-4 text-left space-y-2 mt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{copy.doctor}</span>
              <span className="font-medium">{doctorName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{copy.date}</span>
              <span className="font-medium">{confirmed.date}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{copy.time}</span>
              <span className="font-medium">{confirmed.slot.start}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-8 space-y-8">
        {/* Header with lang toggle */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{doctorName}</h1>
            <p className="text-sm text-muted-foreground">{doctorTitle}</p>
          </div>
          <div className="flex gap-1">
            {(["es", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => switchLang(l)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  lang === l
                    ? "bg-primary text-white"
                    : "bg-border text-muted-foreground hover:bg-border/70"
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar */}
        <div className="rounded-card border border-border bg-surface p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">{copy.selectDate}</p>
          <BookingCalendar
            userId={userId}
            lang={lang}
            selectedDate={selectedDate}
            onDateSelect={(d) => { setSelectedDate(d); setSelectedSlot(null); }}
          />
        </div>

        {/* Slot grid */}
        {selectedDate && (
          <div className="rounded-card border border-border bg-surface p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">{copy.selectSlot}</p>
            <SlotGrid
              userId={userId}
              date={selectedDate}
              lang={lang}
              selectedSlot={selectedSlot}
              onSlotSelect={setSelectedSlot}
            />
          </div>
        )}

        {/* Patient form */}
        {selectedDate && selectedSlot && (
          <div className="rounded-card border border-border bg-surface p-4">
            <PatientForm
              userId={userId}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
              lang={lang}
              onConfirmed={setConfirmed}
            />
          </div>
        )}
      </div>
    </div>
  );
}

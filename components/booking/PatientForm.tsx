"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TimeSlot } from "@/lib/types/booking";

interface PatientFormProps {
  userId: string;
  selectedDate: string;
  selectedSlot: TimeSlot;
  lang: "es" | "en";
  onConfirmed: (booking: { patientName: string; date: string; slot: TimeSlot }) => void;
}

const T = {
  es: {
    title: "Tus datos",
    name: "Nombre completo",
    namePlaceholder: "Tu nombre y apellidos",
    email: "Correo electrónico",
    emailPlaceholder: "tu@email.com",
    nif: "NIF (opcional)",
    nifPlaceholder: "12345678A",
    privacyNote: "Tus datos se usan únicamente para gestionar tu cita y generar la factura.",
    confirmButton: "Confirmar cita",
    confirming: "Confirmando...",
    slotTaken: "Esta hora ya no está disponible, elige otra.",
    error: "No se pudo confirmar la cita. Inténtalo de nuevo.",
  },
  en: {
    title: "Your details",
    name: "Full name",
    namePlaceholder: "Your full name",
    email: "Email address",
    emailPlaceholder: "you@email.com",
    nif: "Tax ID (optional)",
    nifPlaceholder: "12345678A",
    privacyNote: "Your data is used solely to manage your appointment and generate the invoice.",
    confirmButton: "Confirm appointment",
    confirming: "Confirming...",
    slotTaken: "This slot is no longer available, please choose another.",
    error: "Could not confirm the appointment. Please try again.",
  },
};

const inputClass =
  "w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary";

export function PatientForm({ userId, selectedDate, selectedSlot, lang, onConfirmed }: PatientFormProps) {
  const copy = T[lang];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nif, setNif] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim() && email.trim() && !submitting;

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          date: selectedDate,
          slot: selectedSlot,
          patient: { name: name.trim(), email: email.trim(), nif: nif.trim() || null },
          lang,
        }),
      });

      if (res.status === 409) {
        setError(copy.slotTaken);
        setSubmitting(false);
        return;
      }

      if (!res.ok) throw new Error("booking_failed");

      onConfirmed({ patientName: name.trim(), date: selectedDate, slot: selectedSlot });
    } catch {
      setError(copy.error);
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-foreground">{copy.title}</p>

      {error && (
        <div className="rounded-card border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">{copy.name}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={copy.namePlaceholder}
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">{copy.email}</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={copy.emailPlaceholder}
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">{copy.nif}</label>
        <input
          type="text"
          value={nif}
          onChange={(e) => setNif(e.target.value)}
          placeholder={copy.nifPlaceholder}
          className={inputClass}
        />
      </div>

      <p className="text-xs text-muted-foreground">{copy.privacyNote}</p>

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full bg-primary text-white hover:bg-primary/90"
        size="lg"
      >
        {submitting ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {copy.confirming}
          </span>
        ) : (
          copy.confirmButton
        )}
      </Button>
    </div>
  );
}

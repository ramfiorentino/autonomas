"use client";

import { useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import esMessages from "@/messages/es.json";
import enMessages from "@/messages/en.json";
import { Button } from "@/components/ui/button";

const messages = { es: esMessages, en: enMessages };

export default function BookingPage({
  params,
}: {
  params: { slug: string };
}) {
  const [locale, setLocale] = useState<"es" | "en">("es");

  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-lg space-y-6">
          {/* Locale toggle */}
          <div className="flex justify-end gap-2">
            <Button
              variant={locale === "es" ? "default" : "outline"}
              size="sm"
              onClick={() => setLocale("es")}
            >
              ES
            </Button>
            <Button
              variant={locale === "en" ? "default" : "outline"}
              size="sm"
              onClick={() => setLocale("en")}
            >
              EN
            </Button>
          </div>

          <h1 className="text-2xl font-semibold text-foreground">
            {locale === "es" ? "Reservar cita" : "Book appointment"}
          </h1>
          <p className="text-muted-foreground">
            {locale === "es"
              ? "Selecciona un horario disponible."
              : "Select an available time slot."}
          </p>
          <p className="text-xs text-muted-foreground">Slot: {params.slug}</p>
        </div>
      </div>
    </NextIntlClientProvider>
  );
}

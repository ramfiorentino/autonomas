"use client";

import { useSearchParams } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { Suspense } from "react";
import esMessages from "@/messages/es.json";
import enMessages from "@/messages/en.json";

const messages = { es: esMessages, en: enMessages };

function OnboardingProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i < current ? "w-6 bg-primary" : "w-4 bg-border"
          }`}
        />
      ))}
    </div>
  );
}

function OnboardingLayoutInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const locale = (searchParams.get("locale") ?? "es") as "es" | "en";
  const step = Number(searchParams.get("step") ?? "1");

  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      <div className="flex min-h-screen flex-col bg-background">
        {/* Header */}
        <header className="flex items-center justify-between px-6 pt-8 pb-4">
          <span className="text-xl font-extrabold tracking-tight text-primary">
            Autonomas
          </span>
          <OnboardingProgress current={step} total={3} />
        </header>

        {/* Content */}
        <main className="flex flex-1 flex-col items-center px-6 pb-10">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>
    </NextIntlClientProvider>
  );
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <OnboardingLayoutInner>{children}</OnboardingLayoutInner>
    </Suspense>
  );
}

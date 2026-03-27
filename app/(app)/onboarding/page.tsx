"use client";

import { useRouter } from "next/navigation";

const languages = [
  { code: "es", label: "Español", sublabel: "Castellano" },
  { code: "en", label: "English", sublabel: "English" },
] as const;

export default function OnboardingScreen1() {
  const router = useRouter();

  function handleSelect(locale: "es" | "en") {
    router.push(`/onboarding/login?locale=${locale}&step=2`);
  }

  return (
    <div className="pt-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">
          {/* Shown before locale is picked — use both languages */}
          Elige tu idioma / Choose your language
        </h1>
        <p className="text-sm text-muted-foreground">
          Puedes cambiarlo más adelante · You can change this later
        </p>
      </div>

      <div className="space-y-3">
        {languages.map(({ code, label, sublabel }) => (
          <button
            key={code}
            onClick={() => handleSelect(code)}
            className="w-full rounded-card border-2 border-border bg-surface p-5 text-left transition-colors hover:border-primary hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <p className="text-lg font-semibold text-foreground">{label}</p>
            <p className="text-sm text-muted-foreground">{sublabel}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveAvailability } from "@/lib/actions/save-availability";
import { slugify } from "@/lib/slugify";
import type { AvailabilityRule, WorkingHours } from "@/lib/types/booking";

type DayKey = keyof AvailabilityRule["weekdays"];
const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const SLOT_DURATIONS = [20, 30, 45, 60] as const;

const defaultHours = (): WorkingHours => ({ enabled: false, from: "09:00", to: "17:00" });

const defaultRules = (): AvailabilityRule => ({
  slotDuration: 30,
  weekdays: {
    mon: { enabled: true, from: "09:00", to: "14:00" },
    tue: { enabled: true, from: "09:00", to: "14:00" },
    wed: { enabled: true, from: "09:00", to: "14:00" },
    thu: { enabled: true, from: "09:00", to: "14:00" },
    fri: { enabled: true, from: "09:00", to: "14:00" },
    sat: defaultHours(),
    sun: defaultHours(),
  },
  blockedDates: [],
});

const inputClass =
  "rounded-card border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary";

export default function SetupPage() {
  const t = useTranslations("appointments.setup");
  const router = useRouter();
  const { data: session } = useSession();

  const [rules, setRules] = useState<AvailabilityRule>(defaultRules());
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [blockedInput, setBlockedInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);

  // Auto-populate slug from doctor's name on first load
  useEffect(() => {
    if (!slugEdited && session?.user?.name) {
      setSlug(slugify(session.user.name));
    }
  }, [session?.user?.name, slugEdited]);

  function toggleDay(day: DayKey) {
    setRules((prev) => ({
      ...prev,
      weekdays: {
        ...prev.weekdays,
        [day]: { ...prev.weekdays[day], enabled: !prev.weekdays[day].enabled },
      },
    }));
  }

  function updateHours(day: DayKey, field: "from" | "to", value: string) {
    setRules((prev) => ({
      ...prev,
      weekdays: {
        ...prev.weekdays,
        [day]: { ...prev.weekdays[day], [field]: value },
      },
    }));
  }

  function addBlockedDate() {
    const date = blockedInput.trim();
    if (!date || rules.blockedDates.includes(date)) return;
    setRules((prev) => ({
      ...prev,
      blockedDates: [...prev.blockedDates, date].sort(),
    }));
    setBlockedInput("");
  }

  function removeBlockedDate(date: string) {
    setRules((prev) => ({
      ...prev,
      blockedDates: prev.blockedDates.filter((d) => d !== date),
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSlugError(null);

    const result = await saveAvailability(rules, slug);
    setSaving(false);

    if (!result.success) {
      if (result.error === "slug_taken") {
        setSlugError(t("slugTaken", { suggestion: result.slugSuggestion ?? "" }));
      } else {
        setError(result.error ?? "Unknown error");
      }
      return;
    }

    setSaved(true);
    setTimeout(() => router.push("/appointments"), 1200);
  }

  const bookingUrl = `autonomas.app/book/${slug || "…"}`;

  return (
    <div className="p-4 pb-32 space-y-6">
      {/* Back */}
      <button
        onClick={() => router.push("/appointments")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {useTranslations("appointments")("title")}
      </button>

      <div>
        <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      {error && (
        <div className="rounded-card border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Booking URL */}
      <div className="rounded-card border border-border bg-surface p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {t("bookingUrl")}
        </p>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">{t("slugLabel")}</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlug(slugify(e.target.value));
              setSlugEdited(true);
              setSlugError(null);
            }}
            className={inputClass + " w-full"}
          />
          {slugError && <p className="text-xs text-destructive">{slugError}</p>}
          <p className="text-xs text-muted-foreground">{t("slugHint")}</p>
        </div>
        <p className="text-xs font-mono text-primary bg-primary/5 rounded px-2 py-1">
          {bookingUrl}
        </p>
        <p className="text-xs text-muted-foreground">{t("bookingUrlHint")}</p>
      </div>

      {/* Slot duration */}
      <div className="rounded-card border border-border bg-surface p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {t("slotDuration")}
        </p>
        <div className="flex gap-2 flex-wrap">
          {SLOT_DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => setRules((prev) => ({ ...prev, slotDuration: d }))}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                rules.slotDuration === d
                  ? "bg-primary text-white"
                  : "bg-border text-muted-foreground hover:bg-border/70"
              }`}
            >
              {t("slotDurationLabel", { minutes: d })}
            </button>
          ))}
        </div>
      </div>

      {/* Working hours */}
      <div className="rounded-card border border-border bg-surface p-4 space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {t("workingHours")}
        </p>
        {DAY_KEYS.map((day) => {
          const hours = rules.weekdays[day];
          return (
            <div key={day} className="space-y-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleDay(day)}
                  className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                    hours.enabled ? "bg-primary" : "bg-border"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      hours.enabled ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="text-sm font-medium w-24 text-foreground">
                  {t(`days.${day}`)}
                </span>
              </div>
              {hours.enabled && (
                <div className="ml-13 flex items-center gap-2 pl-13">
                  <span className="text-xs text-muted-foreground w-8">{t("from")}</span>
                  <input
                    type="time"
                    value={hours.from}
                    onChange={(e) => updateHours(day, "from", e.target.value)}
                    className={inputClass}
                  />
                  <span className="text-xs text-muted-foreground w-4">{t("to")}</span>
                  <input
                    type="time"
                    value={hours.to}
                    onChange={(e) => updateHours(day, "to", e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Blocked dates */}
      <div className="rounded-card border border-border bg-surface p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {t("blockedDates")}
        </p>
        <p className="text-xs text-muted-foreground">{t("blockedDatesHint")}</p>
        <div className="flex gap-2">
          <input
            type="date"
            value={blockedInput}
            onChange={(e) => setBlockedInput(e.target.value)}
            className={inputClass + " flex-1"}
          />
          <Button variant="outline" size="sm" onClick={addBlockedDate}>
            +
          </Button>
        </div>
        {rules.blockedDates.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {rules.blockedDates.map((date) => (
              <span
                key={date}
                className="inline-flex items-center gap-1 rounded-full bg-border px-3 py-1 text-xs text-foreground"
              >
                {date}
                <button
                  onClick={() => removeBlockedDate(date)}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-40">
        <Button
          onClick={handleSave}
          disabled={saving || saved || !slug}
          className="w-full bg-primary text-white hover:bg-primary/90"
          size="lg"
        >
          {saved ? (
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              {t("saved")}
            </span>
          ) : saving ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("saving")}
            </span>
          ) : (
            t("saveButton")
          )}
        </Button>
      </div>
    </div>
  );
}

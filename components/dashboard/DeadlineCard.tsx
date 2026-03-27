"use client";

import { useTranslations, useLocale } from "next-intl";
import { getNextDeadline, getDeadlineUrgency } from "@/lib/quarter";

export function DeadlineCard() {
  const t = useTranslations("dashboard.deadlineCard");
  const locale = useLocale();

  const { label, date, daysRemaining } = getNextDeadline();
  const urgency = getDeadlineUrgency(daysRemaining);

  const urgencyClass =
    urgency === "critical"
      ? "text-red-600"
      : urgency === "warning"
        ? "text-amber-600"
        : "text-muted-foreground";

  const formattedDate = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

  return (
    <div className="rounded-card border border-border bg-surface p-4 space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {t("label")}
      </p>
      <p className="text-sm font-semibold text-foreground">
        {t(label as "q1" | "q2" | "q3" | "q4")}
      </p>
      <p className="text-xs text-muted-foreground">{formattedDate}</p>
      <p className={`text-2xl font-bold ${urgencyClass}`}>
        {t("daysRemaining", { days: daysRemaining })}
      </p>
    </div>
  );
}

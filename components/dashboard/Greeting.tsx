"use client";

import { useSession } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";

export function Greeting() {
  const { data: session } = useSession();
  const t = useTranslations("dashboard");
  const locale = useLocale();

  const fullName = session?.user?.name ?? "";
  const firstName = fullName.split(" ")[0] ?? fullName;

  const today = new Date();
  const formattedDate = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(today);

  return (
    <div className="space-y-0.5">
      <h1 className="text-2xl font-bold text-foreground">
        {t("greeting", { name: firstName })}
      </h1>
      <p className="text-sm text-muted-foreground capitalize">{formattedDate}</p>
    </div>
  );
}

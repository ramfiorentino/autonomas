"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { AlertTriangle, X } from "lucide-react";

export function PastDueBanner() {
  const { data: session } = useSession();
  const t = useTranslations("pastDue");
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || session?.status !== "past_due") return null;

  async function handlePortalLink() {
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) router.push(data.url);
    } catch {
      // Non-blocking
    }
  }

  return (
    <div className="flex items-start gap-3 bg-amber-50 border-b border-amber-200 px-4 py-3">
      <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
      <p className="flex-1 text-sm text-amber-800">
        {t("message")}{" "}
        <button
          onClick={handlePortalLink}
          className="underline font-medium hover:no-underline"
        >
          {t("link")}
        </button>
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-600 hover:text-amber-800"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

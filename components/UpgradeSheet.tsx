"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpgradeSheetProps {
  featureName?: string;
  onClose: () => void;
}

export function UpgradeSheet({ featureName, onClose }: UpgradeSheetProps) {
  const t = useTranslations("upgrade");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        router.push(data.url);
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-card bg-background p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <p className="font-semibold text-foreground">{t("title")}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {featureName && (
          <p className="text-sm text-muted-foreground">
            {t("featureDescription", { feature: featureName })}
          </p>
        )}

        <div className="rounded-card border border-border bg-muted/30 p-4 space-y-1">
          <p className="font-semibold text-foreground">{t("planName")}</p>
          <p className="text-2xl font-bold text-primary">
            {t("price")}
            <span className="text-sm font-normal text-muted-foreground">
              {t("perMonth")}
            </span>
          </p>
        </div>

        <Button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full bg-primary text-white hover:bg-primary/90"
          size="lg"
        >
          {loading ? t("loading") : t("cta")}
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Info, Loader2, AlertCircle } from "lucide-react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { completeOnboarding } from "@/lib/actions/complete-onboarding";

type ActivityType = "medical" | "other";
type IrpfRate = 7 | 15;

function SelectCard({
  selected,
  onClick,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-card border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        selected
          ? "border-primary bg-primary-light"
          : "border-border bg-surface hover:border-primary/40"
      }`}
    >
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
    </button>
  );
}

function SetupScreenInner() {
  const t = useTranslations("onboarding.step3");
  const tError = useTranslations("onboarding.error");
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = searchParams.get("locale") ?? "es";

  const [activityType, setActivityType] = useState<ActivityType | null>(null);
  const [irpfRate, setIrpfRate] = useState<IrpfRate | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = activityType !== null && irpfRate !== null && !loading;

  async function handleSubmit() {
    if (!activityType || !irpfRate) return;
    setLoading(true);
    setError(null);

    const result = await completeOnboarding({ locale, activityType, irpfRate });

    if (result.success) {
      router.push("/dashboard");
    } else {
      setLoading(false);
      setError(result.error ?? "Unknown error");
    }
  }

  // Detect Drive permission errors
  const isDrivePermissionError =
    error !== null &&
    (error.toLowerCase().includes("403") ||
      error.toLowerCase().includes("forbidden") ||
      error.toLowerCase().includes("permission") ||
      error.toLowerCase().includes("unauthorized") ||
      error.toLowerCase().includes("401"));

  async function handleGrantPermission() {
    await signIn("google", {
      callbackUrl: `/onboarding/setup?locale=${locale}&step=3`,
      prompt: "consent",
    } as Parameters<typeof signIn>[1]);
  }

  // Full-screen error state
  if (error) {
    return (
      <div className="pt-8 space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">{tError("title")}</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          {isDrivePermissionError && (
            <p className="text-sm text-muted-foreground">{tError("drivePermission")}</p>
          )}
        </div>
        <div className="space-y-3">
          {isDrivePermissionError ? (
            <Button
              onClick={handleGrantPermission}
              className="w-full bg-primary text-white hover:bg-primary/90"
              size="lg"
            >
              {tError("grantPermissionButton")}
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              className="w-full bg-primary text-white hover:bg-primary/90"
              size="lg"
            >
              {tError("retryButton")}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Activity type */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">{t("activityTitle")}</p>
        <SelectCard
          selected={activityType === "medical"}
          onClick={() => setActivityType("medical")}
          title={t("medicalTitle")}
          description={t("medicalDescription")}
        />
        <SelectCard
          selected={activityType === "other"}
          onClick={() => setActivityType("other")}
          title={t("otherTitle")}
          description={t("otherDescription")}
        />
      </div>

      {/* IRPF rate */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">{t("irpfTitle")}</p>
          <button
            onClick={() => setShowTooltip((v) => !v)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Info className="h-3.5 w-3.5" />
            {t("irpfTooltipTrigger")}
          </button>
        </div>

        {showTooltip && (
          <div className="rounded-card border border-border bg-primary-light p-3">
            <p className="text-xs text-foreground">{t("irpfTooltipBody")}</p>
          </div>
        )}

        <SelectCard
          selected={irpfRate === 15}
          onClick={() => setIrpfRate(15)}
          title={t("irpf15Title")}
          description={t("irpf15Description")}
        />
        <SelectCard
          selected={irpfRate === 7}
          onClick={() => setIrpfRate(7)}
          title={t("irpf7Title")}
          description={t("irpf7Description")}
        />
      </div>

      {/* CTA */}
      <Button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full bg-primary text-white hover:bg-primary/90 disabled:opacity-40"
        size="lg"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("loading")}
          </span>
        ) : (
          t("ctaButton")
        )}
      </Button>
    </div>
  );
}

export default function OnboardingScreen3() {
  return (
    <Suspense>
      <SetupScreenInner />
    </Suspense>
  );
}

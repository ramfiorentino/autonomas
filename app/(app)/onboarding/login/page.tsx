"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { HardDrive, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";

function LoginScreenInner() {
  const t = useTranslations("onboarding.step2");
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = searchParams.get("locale") ?? "es";
  const { data: session } = useSession();

  const hasDriveScope =
    session?.access_token !== undefined &&
    !(session as { error?: string }).error;

  function handleContinue() {
    router.push(`/onboarding/setup?locale=${locale}&step=3`);
  }

  async function handleSignIn() {
    await signIn("google", {
      callbackUrl: `/onboarding/login?locale=${locale}&step=2`,
    });
  }

  async function handleGrantPermission() {
    await signIn("google", {
      callbackUrl: `/onboarding/login?locale=${locale}&step=2`,
      prompt: "consent",
    } as Parameters<typeof signIn>[1]);
  }

  return (
    <div className="pt-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Permission explanations */}
      <div className="space-y-4">
        <div className="flex gap-4 rounded-card border border-border bg-surface p-4">
          <HardDrive className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm text-foreground">{t("driveExplain")}</p>
        </div>
        <div className="flex gap-4 rounded-card border border-border bg-surface p-4">
          <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm text-foreground">{t("calendarExplain")}</p>
        </div>
      </div>

      {/* Drive scope denied error */}
      {session && !hasDriveScope && (
        <div className="rounded-card border border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{t("driveError")}</p>
          </div>
          <Button
            onClick={handleGrantPermission}
            variant="outline"
            className="w-full border-destructive text-destructive hover:bg-destructive/5"
          >
            {t("grantPermission")}
          </Button>
        </div>
      )}

      {/* CTA */}
      <div className="pt-2">
        {session && hasDriveScope ? (
          <Button
            onClick={handleContinue}
            className="w-full bg-primary text-white hover:bg-primary/90"
            size="lg"
          >
            {t("continueButton")}
          </Button>
        ) : (
          <Button
            onClick={handleSignIn}
            className="w-full bg-primary text-white hover:bg-primary/90"
            size="lg"
          >
            {t("signInButton")}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function OnboardingScreen2() {
  return (
    <Suspense>
      <LoginScreenInner />
    </Suspense>
  );
}

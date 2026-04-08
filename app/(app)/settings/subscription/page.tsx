"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CreditCard, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpgradeSheet } from "@/components/UpgradeSheet";
import { getSubscriptionDetails } from "@/lib/actions/get-subscription";
import { verifyCheckout } from "@/lib/actions/verify-checkout";
import type { SubscriptionRecord } from "@/lib/subscription";

function SubscriptionPageInner() {
  const t = useTranslations("subscription");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [details, setDetails] = useState<SubscriptionRecord | null>(null);

  const tier = session?.tier ?? "free";
  const status = session?.status ?? "free";
  const isPaid = tier === "paid";

  useEffect(() => {
    getSubscriptionDetails().then(setDetails);
  }, [session?.tier]);

  const successHandled = useRef(false);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (searchParams.get("success") === "true" && sessionId && !successHandled.current) {
      successHandled.current = true;
      verifyCheckout(sessionId).then(() => {
        // Hard navigate so the browser gets a fresh session from the server
        window.location.replace("/settings/subscription?activated=true");
      });
    }
  }, [searchParams]);

  const activatedHandled = useRef(false);
  useEffect(() => {
    if (searchParams.get("activated") === "true" && !activatedHandled.current) {
      activatedHandled.current = true;
      toast.success(t("successToast"));
      router.replace("/settings/subscription");
    }
  }, [searchParams, t, router]);

  async function handleManage() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        router.push(data.url);
      }
    } finally {
      setPortalLoading(false);
    }
  }

  const formattedPeriodEnd = details?.currentPeriodEnd
    ? new Date(details.currentPeriodEnd).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>

      {isPaid ? (
        <div className="rounded-card border border-border bg-surface p-6 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-primary" />
            <div>
              <p className="font-semibold text-foreground">{t("planPaid")}</p>
              <p className="text-sm text-muted-foreground">
                {status === "past_due" ? t("statusPastDue") : t("statusActive")}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>{t("amount")}</span>
              <span className="text-foreground font-medium">€5.00 / mes</span>
            </div>
            {formattedPeriodEnd && (
              <div className="flex justify-between">
                <span>{t("nextBilling")}</span>
                <span className="text-foreground">{formattedPeriodEnd}</span>
              </div>
            )}
          </div>

          <Button
            onClick={handleManage}
            disabled={portalLoading}
            variant="outline"
            className="w-full"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            {portalLoading ? t("loading") : t("manageButton")}
          </Button>
        </div>
      ) : (
        <div className="rounded-card border border-border bg-surface p-6 space-y-4">
          <div>
            <p className="font-semibold text-foreground">{t("planFree")}</p>
            <p className="text-sm text-muted-foreground">{t("freeDescription")}</p>
          </div>

          <Button
            onClick={() => setShowUpgrade(true)}
            className="w-full bg-primary text-white hover:bg-primary/90"
          >
            {t("upgradeCta")}
          </Button>
        </div>
      )}

      {showUpgrade && (
        <UpgradeSheet onClose={() => setShowUpgrade(false)} />
      )}
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense>
      <SubscriptionPageInner />
    </Suspense>
  );
}

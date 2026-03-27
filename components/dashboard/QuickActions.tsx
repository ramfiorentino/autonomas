"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { FilePlus, ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QuickActions() {
  const t = useTranslations("dashboard.quickActions");
  const router = useRouter();
  const { data: session } = useSession();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Read subscription plan — free tier if not set
  const plan = (session as { plan?: string } | null)?.plan ?? "free";
  const isPaid = plan !== "free";

  function handleScanReceipt() {
    if (isPaid) {
      router.push("/gastos/scan");
    } else {
      setShowUpgradeModal(true);
    }
  }

  return (
    <>
      <div className="flex gap-3">
        <Button
          onClick={() => router.push("/invoices/new")}
          className="flex-1 bg-primary text-white hover:bg-primary/90"
          size="lg"
        >
          <FilePlus className="mr-2 h-4 w-4" />
          {t("newInvoice")}
        </Button>
        <Button
          onClick={handleScanReceipt}
          variant="outline"
          className="flex-1 border-border"
          size="lg"
        >
          <ScanLine className="mr-2 h-4 w-4" />
          {t("scanReceipt")}
        </Button>
      </div>

      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-card bg-background p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-foreground">{t("upgradeRequired")}</p>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">{t("upgradeMessage")}</p>
            <Button
              onClick={() => {
                setShowUpgradeModal(false);
                router.push("/settings/subscription");
              }}
              className="w-full bg-primary text-white hover:bg-primary/90"
            >
              {t("upgradeCta")}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

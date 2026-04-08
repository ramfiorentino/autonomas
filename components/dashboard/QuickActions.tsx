"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { FilePlus, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpgradeSheet } from "@/components/UpgradeSheet";

export function QuickActions() {
  const t = useTranslations("dashboard.quickActions");
  const router = useRouter();
  const { data: session } = useSession();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const isPaid = session?.tier === "paid" &&
    (session?.status === "active" || session?.status === "past_due");

  function handleScanReceipt() {
    if (isPaid) {
      router.push("/expenses/new?scan=true");
    } else {
      setShowUpgrade(true);
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
          onClick={isPaid ? handleScanReceipt : () => router.push("/expenses/new")}
          variant="outline"
          className="flex-1 border-border"
          size="lg"
        >
          <ScanLine className="mr-2 h-4 w-4" />
          {isPaid ? t("scanReceipt") : t("newExpense")}
        </Button>
      </div>

      {showUpgrade && (
        <UpgradeSheet
          featureName={t("scanReceipt")}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </>
  );
}

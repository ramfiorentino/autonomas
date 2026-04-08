"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Camera, Loader2, AlertCircle, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpenseReviewForm } from "@/components/expenses/ExpenseReviewForm";
import { preprocessImage } from "@/lib/image-preprocess";
import { scanQr } from "@/lib/qr-scan";
import type { OcrResult } from "@/app/api/scan-receipt/route";

type PageState =
  | { mode: "capture" }
  | { mode: "scanning" }
  | { mode: "review"; ocrResult: OcrResult; imageBlob: Blob | null }
  | { mode: "error"; message: string };

export default function NewExpensePage() {
  const t = useTranslations("expenses");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const scanMode = searchParams.get("scan") === "true";
  const isPaid = session?.tier === "paid" &&
    (session?.status === "active" || session?.status === "past_due");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pageState, setPageState] = useState<PageState>({ mode: "capture" });

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPageState({ mode: "scanning" });

    let processedBlob: Blob;
    try {
      processedBlob = await preprocessImage(file);
    } catch {
      setPageState({ mode: "error", message: t("errorPreprocessing") });
      return;
    }

    // QR fast-path
    let qrFields = null;
    try {
      qrFields = await scanQr(processedBlob);
    } catch {
      // QR scan failure is non-fatal — fall through to OCR
    }

    // POST to Mistral proxy
    let ocrResult: OcrResult;
    try {
      const formData = new FormData();
      formData.append("image", processedBlob, "receipt.jpg");

      const res = await fetch("/api/scan-receipt", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      ocrResult = await res.json();
    } catch (err) {
      console.error("[new-expense] OCR error:", err);
      setPageState({ mode: "error", message: t("errorOcr") });
      return;
    }

    // QR fields take priority for vendorNif, date, total
    const merged: OcrResult = {
      ...ocrResult,
      vendorNif: qrFields?.vendorNif ?? ocrResult.vendorNif,
      date: qrFields?.date ?? ocrResult.date,
      total: qrFields?.total ?? ocrResult.total,
    };

    setPageState({ mode: "review", ocrResult: merged, imageBlob: processedBlob });
  }

  function handleManualEntry() {
    const emptyResult: OcrResult = {
      vendorName: null,
      vendorNif: null,
      date: null,
      total: null,
      ivaRate: null,
      ivaAmount: null,
      baseImponible: null,
      documentType: null,
    };
    setPageState({ mode: "review", ocrResult: emptyResult, imageBlob: null });
  }

  if (pageState.mode === "review") {
    return (
      <ExpenseReviewForm
        ocrResult={pageState.ocrResult}
        imageBlob={pageState.imageBlob}
        onSaved={() => router.push("/expenses")}
        onBack={() => setPageState({ mode: "capture" })}
      />
    );
  }

  if (pageState.mode === "scanning") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t("scanningReceipt")}</p>
      </div>
    );
  }

  if (pageState.mode === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-foreground font-medium">{pageState.message}</p>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Button onClick={() => setPageState({ mode: "capture" })}>
            {t("retryCapture")}
          </Button>
          <Button variant="outline" onClick={handleManualEntry}>
            <PenLine className="h-4 w-4 mr-2" />
            {t("manualEntry")}
          </Button>
        </div>
      </div>
    );
  }

  // capture mode
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-foreground">{t("newExpenseTitle")}</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
        {isPaid && (
          <div className="w-full max-w-sm space-y-3">
            <p className="text-sm text-center text-muted-foreground">{t("captureHint")}</p>

            {/* Hidden file input — camera capture on mobile, file picker on desktop */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelected}
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-primary text-white hover:bg-primary/90"
              size="lg"
            >
              <Camera className="h-5 w-5 mr-2" />
              {scanMode ? t("scanReceipt") : t("captureImage")}
            </Button>
          </div>
        )}

        <div className="w-full max-w-sm">
          <Button
            variant="outline"
            onClick={handleManualEntry}
            className="w-full"
            size="lg"
          >
            <PenLine className="h-5 w-5 mr-2" />
            {t("manualEntry")}
          </Button>
        </div>

        {!isPaid && (
          <p className="text-xs text-center text-muted-foreground max-w-xs">
            {t("freeOnlyManual")}
          </p>
        )}
      </div>
    </div>
  );
}

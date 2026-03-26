"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function OfflineDetector() {
  // Initialize from navigator.onLine (client-only, safe because this is "use client")
  const [isOffline, setIsOffline] = useState<boolean>(
    () => typeof window !== "undefined" && !navigator.onLine,
  );
  const t = useTranslations("offline");

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  function handleRetry() {
    if (navigator.onLine) {
      window.location.reload();
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Blurred backdrop */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 mx-4 w-full max-w-sm rounded-card border border-border bg-surface p-6 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <WifiOff className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-foreground">
          {t("title")}
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">{t("message")}</p>
        <Button
          onClick={handleRetry}
          className="w-full bg-primary text-white hover:bg-primary/90"
        >
          {t("retry")}
        </Button>
      </div>
    </div>
  );
}

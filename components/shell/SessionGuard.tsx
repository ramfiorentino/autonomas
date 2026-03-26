"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { checkLockAction, acquireLockAction } from "@/app/actions/session";

function getDeviceId(): string {
  let id = sessionStorage.getItem("autonomas-device-id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("autonomas-device-id", id);
  }
  return id;
}

interface SessionGuardProps {
  userId: string;
}

export function SessionGuard({ userId }: SessionGuardProps) {
  const [showConflict, setShowConflict] = useState(false);
  const t = useTranslations("session");

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function run() {
      const deviceId = getDeviceId();
      const existing = await checkLockAction(userId);
      if (cancelled) return;

      if (existing && existing.deviceId !== deviceId) {
        setShowConflict(true);
      } else {
        await acquireLockAction(userId, deviceId);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function handleUseHere() {
    const deviceId = getDeviceId();
    await acquireLockAction(userId, deviceId);
    setShowConflict(false);
  }

  async function handleClose() {
    await signOut({ callbackUrl: "/login" });
  }

  if (!showConflict) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
      <div className="relative z-10 mx-4 w-full max-w-sm rounded-card border border-border bg-surface p-6 shadow-lg">
        <h2 className="mb-2 text-lg font-semibold text-foreground">
          {t("conflictTitle")}
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          {t("conflictMessage")}
        </p>
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleUseHere}
            className="w-full bg-primary text-white hover:bg-primary/90"
          >
            {t("useHere")}
          </Button>
          <Button
            onClick={handleClose}
            variant="outline"
            className="w-full"
          >
            {t("close")}
          </Button>
        </div>
      </div>
    </div>
  );
}

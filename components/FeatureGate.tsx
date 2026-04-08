"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Lock } from "lucide-react";
import { UpgradeSheet } from "./UpgradeSheet";

interface FeatureGateProps {
  children: React.ReactNode;
  featureName?: string;
  onUnlock?: () => void;
}

export function FeatureGate({ children, featureName, onUnlock }: FeatureGateProps) {
  const { data: session } = useSession();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const tier = session?.tier ?? "free";
  const isLocked = tier !== "paid";

  if (!isLocked) {
    return <>{children}</>;
  }

  function handleUnlock() {
    if (onUnlock) {
      onUnlock();
    } else {
      setShowUpgrade(true);
    }
  }

  return (
    <>
      <div
        className="relative cursor-pointer select-none"
        onClick={handleUnlock}
        role="button"
        aria-label="Upgrade to unlock"
      >
        <div className="pointer-events-none opacity-50">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-background/80 p-2 shadow-sm">
            <Lock className="h-5 w-5 text-foreground" />
          </div>
        </div>
      </div>

      {showUpgrade && (
        <UpgradeSheet
          featureName={featureName}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </>
  );
}

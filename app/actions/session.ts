"use server";

import { acquireLock, checkLock, releaseLock } from "@/lib/session-lock";

export async function checkLockAction(userId: string) {
  try {
    return await checkLock(userId);
  } catch {
    // Fail open — don't block the user if KV is unavailable
    return null;
  }
}

export async function acquireLockAction(
  userId: string,
  deviceId: string,
): Promise<void> {
  try {
    await acquireLock(userId, deviceId);
  } catch {
    // Fail silently — session lock is best-effort
  }
}

export async function releaseLockAction(userId: string): Promise<void> {
  try {
    await releaseLock(userId);
  } catch {
    // Fail silently
  }
}

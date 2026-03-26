import { redis } from "@/lib/kv";

const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 hours

interface SessionLock {
  deviceId: string;
  acquiredAt: string;
}

function lockKey(userId: string) {
  return `session:${userId}`;
}

/**
 * Acquire the session lock for a user on a given device.
 * Always overwrites the current lock.
 */
export async function acquireLock(
  userId: string,
  deviceId: string,
): Promise<void> {
  const lock: SessionLock = {
    deviceId,
    acquiredAt: new Date().toISOString(),
  };
  await redis.set(lockKey(userId), JSON.stringify(lock), {
    ex: SESSION_TTL_SECONDS,
  });
}

/**
 * Release the session lock for a user.
 */
export async function releaseLock(userId: string): Promise<void> {
  await redis.del(lockKey(userId));
}

/**
 * Check whether another device holds the session lock.
 * Returns null if no lock exists, or the lock data if one does.
 */
export async function checkLock(userId: string): Promise<SessionLock | null> {
  const raw = await redis.get<string>(lockKey(userId));
  if (!raw) return null;

  try {
    return typeof raw === "string" ? JSON.parse(raw) : (raw as SessionLock);
  } catch {
    return null;
  }
}

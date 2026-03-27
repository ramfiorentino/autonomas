import { redis } from "@/lib/kv";

const cacheKey = (userId: string) => `settings-cache:${userId}`;
const TTL_SECONDS = 3600; // 1 hour

export async function getCachedSettings<T>(userId: string): Promise<T | null> {
  return redis.get<T>(cacheKey(userId));
}

export async function setCachedSettings<T>(userId: string, settings: T): Promise<void> {
  await redis.set(cacheKey(userId), settings, { ex: TTL_SECONDS });
}

export async function invalidateSettingsCache(userId: string): Promise<void> {
  await redis.del(cacheKey(userId));
}

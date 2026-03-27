import { redis } from "@/lib/kv";

const slugKey = (slug: string) => `slug:${slug}`;

export async function resolveSlug(slug: string): Promise<string | null> {
  return redis.get<string>(slugKey(slug));
}

export async function registerSlug(slug: string, userId: string): Promise<void> {
  await redis.set(slugKey(slug), userId);
}

export async function isSlugTaken(slug: string, currentUserId?: string): Promise<boolean> {
  const existing = await redis.get<string>(slugKey(slug));
  if (!existing) return false;
  if (currentUserId && existing === currentUserId) return false; // same user re-saving
  return true;
}

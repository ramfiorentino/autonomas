"use server";

import { auth } from "@/auth";
import { setAvailability, getAvailability } from "@/lib/redis-booking";
import { registerSlug, isSlugTaken } from "@/lib/redis-slug";
import { invalidateSettingsCache } from "@/lib/redis-settings-cache";
import { slugify } from "@/lib/slugify";
import type { AvailabilityRule } from "@/lib/types/booking";

export interface SaveAvailabilityResult {
  success: boolean;
  error?: string;
  slugSuggestion?: string;
}

async function readSettings(token: string): Promise<Record<string, unknown>> {
  // Find Autonomas folder and .autonomas hidden folder
  const rootParams = new URLSearchParams({
    q: `name='Autonomas' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`,
    fields: "files(id)",
    pageSize: "1",
  });
  const rootRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?${rootParams}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const rootData = await rootRes.json();
  const rootId = rootData.files?.[0]?.id;
  if (!rootId) throw new Error("Autonomas folder not found");

  const hiddenParams = new URLSearchParams({
    q: `name='.autonomas' and mimeType='application/vnd.google-apps.folder' and '${rootId}' in parents and trashed=false`,
    fields: "files(id)",
    pageSize: "1",
  });
  const hiddenRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?${hiddenParams}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const hiddenData = await hiddenRes.json();
  const hiddenId = hiddenData.files?.[0]?.id;
  if (!hiddenId) throw new Error(".autonomas folder not found");

  const fileParams = new URLSearchParams({
    q: `name='settings.json' and '${hiddenId}' in parents and trashed=false`,
    fields: "files(id)",
    pageSize: "1",
  });
  const fileRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?${fileParams}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const fileData = await fileRes.json();
  const fileId = fileData.files?.[0]?.id;
  if (!fileId) throw new Error("settings.json not found");

  const contentRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const settings = await contentRes.json();
  return { settings, fileId, hiddenId };
}

async function writeSettings(
  token: string,
  fileId: string,
  settings: Record<string, unknown>,
): Promise<void> {
  await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settings),
    },
  );
}

export async function saveAvailability(
  rules: AvailabilityRule,
  slug: string,
): Promise<SaveAvailabilityResult> {
  const session = await auth();
  if (!session?.user?.id || !session?.access_token) {
    return { success: false, error: "No active session" };
  }

  const userId = session.user.id;
  const token = session.access_token;

  try {
    // Validate slug
    const cleanSlug = slugify(slug);
    if (!cleanSlug) return { success: false, error: "Invalid slug" };

    // Check slug collision (allow same user to re-save their own slug)
    const taken = await isSlugTaken(cleanSlug, userId);
    if (taken) {
      const suggestion = `${cleanSlug}-2`;
      return {
        success: false,
        error: "slug_taken",
        slugSuggestion: suggestion,
      };
    }

    // Write availability to Redis
    await setAvailability(userId, rules);

    // Register slug in Redis
    await registerSlug(cleanSlug, userId);

    // Update settings.json with bookingSlug
    const { settings, fileId } = await readSettings(token) as {
      settings: Record<string, unknown>;
      fileId: string;
      hiddenId: string;
    };
    settings.bookingSlug = cleanSlug;
    await writeSettings(token, fileId, settings);

    // Invalidate settings cache so public page picks up the change
    await invalidateSettingsCache(userId);

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

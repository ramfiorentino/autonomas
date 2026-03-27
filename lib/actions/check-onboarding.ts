"use server";

import { auth } from "@/auth";
import { getFile, AuthError } from "@/lib/drive";
import type { Settings } from "@/lib/drive-init";

export interface OnboardingStatus {
  onboarded: boolean;
  settings: Settings | null;
}

/**
 * Checks whether the current user has completed onboarding by looking for
 * settings.json in their Drive. Fails open — if Drive is unreachable, we
 * assume onboarded to avoid blocking the user.
 */
export async function checkOnboarding(): Promise<OnboardingStatus> {
  const session = await auth();
  if (!session?.access_token) {
    return { onboarded: false, settings: null };
  }

  try {
    // List files in root to find the Autonomas folder
    const rootFiles = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name%3D'Autonomas'+and+mimeType%3D'application%2Fvnd.google-apps.folder'+and+'root'+in+parents+and+trashed%3Dfalse&fields=files(id)`,
      {
        headers: { Authorization: `Bearer ${session.access_token}` },
      },
    );
    const rootData = await rootFiles.json();
    const autonomasFolder = rootData.files?.[0];
    if (!autonomasFolder) return { onboarded: false, settings: null };

    // Find .autonomas hidden folder
    const hiddenFiles = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name%3D'.autonomas'+and+mimeType%3D'application%2Fvnd.google-apps.folder'+and+'${autonomasFolder.id}'+in+parents+and+trashed%3Dfalse&fields=files(id)`,
      {
        headers: { Authorization: `Bearer ${session.access_token}` },
      },
    );
    const hiddenData = await hiddenFiles.json();
    const hiddenFolder = hiddenData.files?.[0];
    if (!hiddenFolder) return { onboarded: false, settings: null };

    // Find settings.json
    const settingsFiles = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name%3D'settings.json'+and+'${hiddenFolder.id}'+in+parents+and+trashed%3Dfalse&fields=files(id)`,
      {
        headers: { Authorization: `Bearer ${session.access_token}` },
      },
    );
    const settingsData = await settingsFiles.json();
    const settingsFile = settingsData.files?.[0];
    if (!settingsFile) return { onboarded: false, settings: null };

    // Read settings content
    const settings = await getFile<Settings>(settingsFile.id, session.access_token);
    return { onboarded: true, settings };
  } catch (err) {
    if (err instanceof AuthError) {
      return { onboarded: false, settings: null };
    }
    // Fail open for other errors (network, Drive unavailable) — don't block the user
    return { onboarded: true, settings: null };
  }
}

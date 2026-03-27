"use server";

import { cookies } from "next/headers";
import { auth } from "@/auth";
import { initUserDrive, writeInitialFiles, type Settings } from "@/lib/drive-init";

export interface CompleteOnboardingInput {
  locale: string;
  activityType: "medical" | "other";
  irpfRate: 7 | 15;
}

export interface CompleteOnboardingResult {
  success: boolean;
  error?: string;
}

export async function completeOnboarding(
  input: CompleteOnboardingInput,
): Promise<CompleteOnboardingResult> {
  const session = await auth();
  if (!session?.access_token) {
    return { success: false, error: "No active session" };
  }

  try {
    const { autonomasHiddenId } = await initUserDrive(session.access_token);

    const settings: Settings = {
      locale: input.locale,
      activityType: input.activityType,
      irpfRate: input.irpfRate,
      bookingSlug: null,
      createdAt: new Date().toISOString(),
    };

    await writeInitialFiles(session.access_token, autonomasHiddenId, settings);

    // Persist locale choice in a cookie so i18n can read it on every request
    const cookieStore = await cookies();
    cookieStore.set("locale", input.locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      httpOnly: false,             // readable client-side for future use
      sameSite: "lax",
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

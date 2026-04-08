import { NextRequest, NextResponse } from "next/server";
import { render } from "@react-email/render";
import { Resend } from "resend";
import { redis } from "@/lib/kv";
import { subscriptionKey, paidUsersKey } from "@/lib/subscription";
import { getDeadlineForMonth, daysRemaining } from "@/lib/tax-deadlines";
import { signUnsubscribeToken } from "@/lib/unsubscribe-token";
import {
  MonthlyReminder,
  getEmailSubject,
  getPlainText,
  type MonthlyReminderProps,
} from "@/emails/MonthlyReminder";
import type { Settings } from "@/lib/drive-init";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "recordatorios@autonomas.app";
const APP_URL = "https://autonomas.app";
const DRIVE_API = "https://www.googleapis.com/drive/v3";

// ─── Drive helpers (server-side, using stored refresh token) ─────────────────

/**
 * Fetch settings.json from a user's Drive using their refresh token.
 * Returns null on any failure; caller defaults to "es".
 */
async function fetchUserLocale(
  userId: string,
): Promise<"es" | "en"> {
  try {
    // Get refresh token from subscription record
    const refreshToken = await redis.hget<string>(
      subscriptionKey(userId),
      "refreshToken",
    );
    if (!refreshToken) return "es";

    // Exchange refresh token for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!tokenRes.ok) return "es";
    const { access_token } = await tokenRes.json();
    if (!access_token) return "es";

    // Find Autonomas folder → .autonomas folder → settings.json
    const rootRes = await fetch(
      `${DRIVE_API}/files?q=name%3D'Autonomas'+and+mimeType%3D'application%2Fvnd.google-apps.folder'+and+'root'+in+parents+and+trashed%3Dfalse&fields=files(id)`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!rootRes.ok) return "es";
    const rootData = await rootRes.json();
    const autonomasId = rootData.files?.[0]?.id;
    if (!autonomasId) return "es";

    const hiddenRes = await fetch(
      `${DRIVE_API}/files?q=name%3D'.autonomas'+and+mimeType%3D'application%2Fvnd.google-apps.folder'+and+'${autonomasId}'+in+parents+and+trashed%3Dfalse&fields=files(id)`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!hiddenRes.ok) return "es";
    const hiddenData = await hiddenRes.json();
    const hiddenId = hiddenData.files?.[0]?.id;
    if (!hiddenId) return "es";

    const settingsFileRes = await fetch(
      `${DRIVE_API}/files?q=name%3D'settings.json'+and+'${hiddenId}'+in+parents+and+trashed%3Dfalse&fields=files(id)`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!settingsFileRes.ok) return "es";
    const settingsFileData = await settingsFileRes.json();
    const settingsFileId = settingsFileData.files?.[0]?.id;
    if (!settingsFileId) return "es";

    const settingsRes = await fetch(
      `${DRIVE_API}/files/${settingsFileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!settingsRes.ok) return "es";
    const settings: Settings = await settingsRes.json();
    return settings.locale === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}

// ─── Cron handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Validate cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const month = now.getMonth() + 1; // 1-indexed
  const year = now.getFullYear();

  // Detect deadline for this month
  const deadlineInfo = getDeadlineForMonth(month, year);
  const deadlineWithDays = deadlineInfo
    ? {
        ...deadlineInfo,
        daysRemaining: daysRemaining(deadlineInfo.day, month, year, now),
      }
    : undefined;

  // Get all paid users
  let userIds: string[] = [];
  try {
    const members = await redis.smembers(paidUsersKey);
    userIds = members as string[];
  } catch (err) {
    console.error("[cron/monthly-reminder] Failed to read paid_users:", err);
    return NextResponse.json({ error: "Redis error" }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const userId of userIds) {
    try {
      // Check unsubscribe preference
      const prefs = await redis.hgetall<{ unsubscribed?: string }>(
        `email_prefs:${userId}`,
      );
      if (prefs?.unsubscribed === "true") {
        skipped++;
        continue;
      }

      // Get user email
      const userEmail = await redis.hget<string>(
        subscriptionKey(userId),
        "userEmail",
      );
      if (!userEmail) {
        console.warn(
          `[cron/monthly-reminder] No email for userId ${userId}, skipping`,
        );
        skipped++;
        continue;
      }

      // Get user name from subscription record (best-effort)
      const userName = await redis.hget<string>(
        subscriptionKey(userId),
        "userName",
      );

      // Get locale from Drive settings (5s timeout, default es)
      const locale = await fetchUserLocale(userId);

      // Generate unsubscribe URL
      const unsubscribeToken = signUnsubscribeToken(userId, userEmail);
      const unsubscribeUrl = `${APP_URL}/api/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;

      const emailProps: MonthlyReminderProps = {
        locale,
        name: userName ?? undefined,
        unsubscribeUrl,
        deadline: deadlineWithDays,
      };

      const subject = getEmailSubject(locale, deadlineWithDays);
      const html = await render(MonthlyReminder(emailProps));
      const text = getPlainText(
        locale,
        userName ?? undefined,
        unsubscribeUrl,
        deadlineWithDays,
      );

      const { error } = await resend.emails.send({
        from: FROM,
        to: userEmail,
        subject,
        html,
        text,
      });

      if (error) {
        console.error(
          `[cron/monthly-reminder] Resend error for ${userId}:`,
          error,
        );
        failed++;
      } else {
        sent++;
      }
    } catch (err) {
      console.error(
        `[cron/monthly-reminder] Unexpected error for userId ${userId}:`,
        err,
      );
      failed++;
    }
  }

  console.log(
    `[cron/monthly-reminder] Done — sent: ${sent}, skipped: ${skipped}, failed: ${failed}`,
  );
  return NextResponse.json({ sent, skipped, failed });
}

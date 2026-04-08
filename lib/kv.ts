/**
 * Upstash Redis client and namespace documentation.
 *
 * Key namespace conventions:
 *   session:{userId}                 — single-session lock { deviceId, acquiredAt }, TTL 24h
 *   subscription:{userId}            — subscription status hash:
 *                                        { tier, status, stripeCustomerId, stripeSubscriptionId,
 *                                          currentPeriodEnd, userEmail, userName }
 *   stripe_customer:{customerId}     — reverse lookup: Stripe customer ID → userId (string)
 *   subscription_grace:{userId}      — TTL key (7 days) signalling past_due grace period
 *   paid_users                       — Redis SET of userIds with active paid subscriptions;
 *                                        managed by subscription-payments webhooks;
 *                                        read by monthly-reminders cron
 *   email_prefs:{userId}             — email preferences hash: { unsubscribed: "true" | absent }
 *                                        set by /api/unsubscribe; checked by monthly-reminders cron
 *   availability:{userId}            — working hours and blocked slots
 *   bookings:{userId}:{YYYY-MM}      — booking entries for a given month
 *   patients:{userId}                — patient directory
 *   settings-cache:{userId}          — cached settings.json content, TTL 1h
 *
 * Financial data is NEVER stored in Redis. All financial data lives in Google Drive.
 */
import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

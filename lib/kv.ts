/**
 * Upstash Redis client and namespace documentation.
 *
 * Key namespace conventions:
 *   session:{userId}                 — single-session lock { deviceId, acquiredAt }, TTL 24h
 *   subscription:{userId}            — subscription status { plan, validUntil }
 *   availability:{userId}            — working hours and blocked slots
 *   bookings:{userId}:{YYYY-MM}      — booking entries for a given month
 *   patients:{userId}                — patient directory
 *   email_prefs:{userId}             — email notification preferences
 *
 * Financial data is NEVER stored in Redis. All financial data lives in Google Drive.
 */
import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

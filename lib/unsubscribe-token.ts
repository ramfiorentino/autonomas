/**
 * Unsubscribe token utilities.
 *
 * Tokens are minimal JWT HS256 tokens signed with UNSUBSCRIBE_SECRET.
 * They contain { userId, email } and expire after 30 days.
 *
 * Uses Node.js built-in `crypto` — no extra dependency.
 */

import { createHmac } from "crypto";

interface UnsubscribePayload {
  userId: string;
  email: string;
  exp: number; // Unix timestamp seconds
}

function b64url(input: string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const mod = padded.length % 4;
  const paddedStr = mod ? padded + "=".repeat(4 - mod) : padded;
  return Buffer.from(paddedStr, "base64").toString("utf8");
}

const HEADER = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));

function sign(signingInput: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(signingInput)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Sign a 30-day unsubscribe token for the given user.
 */
export function signUnsubscribeToken(userId: string, email: string): string {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) throw new Error("UNSUBSCRIBE_SECRET env var is not set");

  const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
  const payload = b64url(JSON.stringify({ userId, email, exp }));
  const signingInput = `${HEADER}.${payload}`;
  const signature = sign(signingInput, secret);

  return `${signingInput}.${signature}`;
}

/**
 * Verify an unsubscribe token.
 * Returns the payload if valid and not expired, or null otherwise.
 */
export function verifyUnsubscribeToken(
  token: string,
): { userId: string; email: string } | null {
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const signingInput = `${header}.${payload}`;
  const expectedSig = sign(signingInput, secret);

  // Constant-time comparison
  if (
    signature.length !== expectedSig.length ||
    !timingSafeEqual(signature, expectedSig)
  ) {
    return null;
  }

  let parsed: UnsubscribePayload;
  try {
    parsed = JSON.parse(fromB64url(payload)) as UnsubscribePayload;
  } catch {
    return null;
  }

  if (!parsed.userId || !parsed.email || !parsed.exp) return null;
  if (Math.floor(Date.now() / 1000) > parsed.exp) return null;

  return { userId: parsed.userId, email: parsed.email };
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) {
    diff |= bufA[i] ^ bufB[i];
  }
  return diff === 0;
}

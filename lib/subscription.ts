import { redis } from "@/lib/kv";

// ── Key helpers ──────────────────────────────────────────────────────────────

export const subscriptionKey = (userId: string) => `subscription:${userId}`;
export const paidUsersKey = "paid_users";
export const stripeCustomerKey = (customerId: string) =>
  `stripe_customer:${customerId}`;
export const gracePeriodKey = (userId: string) =>
  `subscription_grace:${userId}`;

// ── Types ────────────────────────────────────────────────────────────────────

export interface SubscriptionRecord {
  tier: "paid" | "free";
  status: "active" | "past_due" | "cancelled" | "free";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string;
}

const FREE_RECORD: SubscriptionRecord = { tier: "free", status: "free" };

// ── Read ─────────────────────────────────────────────────────────────────────

export async function getSubscription(
  userId: string,
): Promise<SubscriptionRecord> {
  const data = await redis.hgetall<Record<string, string>>(
    subscriptionKey(userId),
  );
  if (!data || !data.tier) return FREE_RECORD;
  return {
    tier: data.tier as SubscriptionRecord["tier"],
    status: data.status as SubscriptionRecord["status"],
    stripeCustomerId: data.stripeCustomerId,
    stripeSubscriptionId: data.stripeSubscriptionId,
    currentPeriodEnd: data.currentPeriodEnd,
  };
}

export async function isEffectivelyPaid(
  sub: SubscriptionRecord,
  userId: string,
): Promise<boolean> {
  if (sub.status === "active") return true;
  if (sub.status === "past_due") {
    const graceExists = await redis.exists(gracePeriodKey(userId));
    return graceExists === 1;
  }
  return false;
}

// ── Write ────────────────────────────────────────────────────────────────────

export async function provisionPaidSubscription(
  userId: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  periodEnd: string,
): Promise<void> {
  await redis.hset(subscriptionKey(userId), {
    tier: "paid",
    status: "active",
    stripeCustomerId,
    stripeSubscriptionId,
    currentPeriodEnd: periodEnd,
  });
  await redis.sadd(paidUsersKey, userId);
  await redis.set(stripeCustomerKey(stripeCustomerId), userId);
}

export async function downgradeToFree(userId: string): Promise<void> {
  await redis.hset(subscriptionKey(userId), {
    tier: "free",
    status: "free",
  });
  await redis.srem(paidUsersKey, userId);
}

export async function setPastDue(userId: string): Promise<void> {
  await redis.hset(subscriptionKey(userId), { status: "past_due" });
  // 7-day grace period TTL key
  await redis.set(gracePeriodKey(userId), "1", { ex: 7 * 24 * 60 * 60 });
}

export async function updatePeriodEnd(
  userId: string,
  periodEnd: string,
): Promise<void> {
  await redis.hset(subscriptionKey(userId), { currentPeriodEnd: periodEnd });
}

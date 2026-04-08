"use server";

import { auth } from "@/auth";
import { getSubscription } from "@/lib/subscription";
import type { SubscriptionRecord } from "@/lib/subscription";

export async function getSubscriptionDetails(): Promise<SubscriptionRecord | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return getSubscription(session.user.id);
}

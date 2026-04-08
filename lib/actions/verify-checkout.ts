"use server";

import Stripe from "stripe";
import { auth } from "@/auth";
import { redis } from "@/lib/kv";
import {
  stripeCustomerKey,
  provisionPaidSubscription,
  getSubscription,
} from "@/lib/subscription";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function verifyCheckout(sessionId: string): Promise<boolean> {
  const authSession = await auth();
  if (!authSession?.user?.id) return false;

  const userId = authSession.user.id;

  const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

  if (
    checkoutSession.payment_status !== "paid" ||
    checkoutSession.mode !== "subscription" ||
    !checkoutSession.subscription ||
    !checkoutSession.customer
  ) {
    return false;
  }

  const customerId = checkoutSession.customer as string;
  const subscriptionId = checkoutSession.subscription as string;

  // Ensure reverse lookup exists
  const existing = await redis.get(stripeCustomerKey(customerId));
  if (!existing) {
    await redis.set(stripeCustomerKey(customerId), userId);
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const periodEnd = new Date(
    subscription.current_period_end * 1000,
  ).toISOString();

  await provisionPaidSubscription(userId, customerId, subscriptionId, periodEnd);
  return true;
}

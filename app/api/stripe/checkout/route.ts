import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/auth";
import { redis } from "@/lib/kv";
import { subscriptionKey, stripeCustomerKey } from "@/lib/subscription";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Retrieve or create Stripe customer
  let stripeCustomerId: string | null = await redis.hget(
    subscriptionKey(userId),
    "stripeCustomerId",
  );

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: session.user.email ?? undefined,
      name: session.user.name ?? undefined,
      metadata: { userId },
    });
    stripeCustomerId = customer.id;
    // Store reverse lookup and user email for cron access
    await redis.set(stripeCustomerKey(stripeCustomerId), userId);
    if (session.user.email) {
      await redis.hset(subscriptionKey(userId), { userEmail: session.user.email });
    }
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "subscription",
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID!,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXTAUTH_URL ?? "https://autonomas.app"}/settings/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXTAUTH_URL ?? "https://autonomas.app"}/settings/subscription`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}

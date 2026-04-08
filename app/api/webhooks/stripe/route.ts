import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { redis } from "@/lib/kv";
import {
  stripeCustomerKey,
  subscriptionKey,
  provisionPaidSubscription,
  downgradeToFree,
  setPastDue,
  updatePeriodEnd,
} from "@/lib/subscription";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function resolveUserId(customerId: string): Promise<string | null> {
  return redis.get<string>(stripeCustomerKey(customerId));
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        const userId = await resolveUserId(customerId);
        if (!userId) {
          console.error("[stripe/webhook] No userId for customer", customerId);
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const periodEnd = new Date(
          subscription.current_period_end * 1000,
        ).toISOString();

        await provisionPaidSubscription(userId, customerId, subscriptionId, periodEnd);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const userId = await resolveUserId(customerId);
        if (!userId) break;

        // Update period end from the subscription on the invoice
        const subscriptionId = (invoice as { subscription?: string }).subscription;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const periodEnd = new Date(
            subscription.current_period_end * 1000,
          ).toISOString();
          await updatePeriodEnd(userId, periodEnd);
          // Ensure status is active (covers recovery from past_due)
          await redis.hset(subscriptionKey(userId), { status: "active", tier: "paid" });
          await redis.sadd("paid_users", userId);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const userId = await resolveUserId(customerId);
        if (!userId) break;
        await setPastDue(userId);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const userId = await resolveUserId(customerId);
        if (!userId) break;
        await downgradeToFree(userId);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const userId = await resolveUserId(customerId);
        if (!userId) break;

        const periodEnd = new Date(
          subscription.current_period_end * 1000,
        ).toISOString();
        const status = subscription.status;

        await redis.hset(subscriptionKey(userId), {
          status: status === "active" ? "active" : status === "past_due" ? "past_due" : "cancelled",
          currentPeriodEnd: periodEnd,
        });
        break;
      }

      default:
        console.log("[stripe/webhook] Unhandled event type:", event.type);
    }
  } catch (err) {
    console.error("[stripe/webhook] Handler error:", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

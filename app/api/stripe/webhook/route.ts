import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { redis } from "@/lib/kv";
import {
  stripeCustomerKey,
  provisionPaidSubscription,
  downgradeToFree,
  setPastDue,
  updatePeriodEnd,
} from "@/lib/subscription";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

async function userIdFromCustomer(customerId: string): Promise<string | null> {
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
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log("[stripe-webhook] received:", event.type);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("[stripe-webhook] checkout.session.completed mode:", session.mode, "customer:", session.customer);
        if (session.mode !== "subscription") break;

        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        const userId = await userIdFromCustomer(customerId);
        console.log("[stripe-webhook] userId lookup:", userId, "for customer:", customerId);
        if (!userId) {
          console.error("No userId for Stripe customer:", customerId);
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const periodEnd = new Date(
          subscription.current_period_end * 1000,
        ).toISOString();

        await provisionPaidSubscription(userId, customerId, subscriptionId, periodEnd);
        console.log("[stripe-webhook] provisioned paid for userId:", userId);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const userId = await userIdFromCustomer(customerId);
        if (!userId) break;

        const periodEnd = new Date(
          subscription.current_period_end * 1000,
        ).toISOString();

        if (subscription.status === "active") {
          await provisionPaidSubscription(
            userId,
            customerId,
            subscription.id,
            periodEnd,
          );
        } else if (subscription.status === "past_due") {
          await setPastDue(userId);
        } else if (
          subscription.status === "canceled" ||
          subscription.status === "unpaid"
        ) {
          await downgradeToFree(userId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const userId = await userIdFromCustomer(customerId);
        if (!userId) break;

        await downgradeToFree(userId);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) break;

        const customerId = invoice.customer as string;
        const userId = await userIdFromCustomer(customerId);
        if (!userId) break;

        const subscription = await stripe.subscriptions.retrieve(
          invoice.subscription as string,
        );
        const periodEnd = new Date(
          subscription.current_period_end * 1000,
        ).toISOString();

        await updatePeriodEnd(userId, periodEnd);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) break;

        const customerId = invoice.customer as string;
        const userId = await userIdFromCustomer(customerId);
        if (!userId) break;

        await setPastDue(userId);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error(`Error handling webhook ${event.type}:`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

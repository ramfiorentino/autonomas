import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/auth";
import { getSubscription } from "@/lib/subscription";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const sub = await getSubscription(userId);

  if (sub.tier !== "paid" || !sub.stripeCustomerId) {
    return NextResponse.json(
      { error: "No active paid subscription" },
      { status: 403 },
    );
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${process.env.NEXTAUTH_URL ?? "https://autonomas.app"}/settings/subscription`,
  });

  return NextResponse.json({ url: portalSession.url });
}

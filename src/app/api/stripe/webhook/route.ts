import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyStripeSignature } from "@/lib/stripe";

// Webhook Stripe: jedyne źródło prawdy o stanie subskrypcji (zapis do profiles przez service role).
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "no secret" }, { status: 500 });
  const payload = await request.text();
  if (!verifyStripeSignature(payload, request.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  const event = JSON.parse(payload);
  const db = createAdminClient();
  const obj = event.data?.object ?? {};

  try {
    if (event.type === "checkout.session.completed" && obj.mode === "subscription") {
      const userId = obj.client_reference_id ?? obj.metadata?.user_id;
      if (userId) {
        await db
          .from("profiles")
          .update({
            stripe_customer_id: obj.customer,
            stripe_subscription_id: obj.subscription,
            subscription_source: "stripe",
          })
          .eq("id", userId);
      }
    } else if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const status: string = event.type === "customer.subscription.deleted" ? "canceled" : obj.status;
      const mapped =
        status === "active" || status === "trialing" ? "active" : status === "past_due" ? "past_due" : status === "incomplete" ? null : "canceled";
      const periodEnd = obj.current_period_end ?? obj.items?.data?.[0]?.current_period_end;
      const patch: Record<string, unknown> = {
        stripe_customer_id: obj.customer,
        stripe_subscription_id: obj.id,
        subscription_source: "stripe",
        cancel_at_period_end: !!obj.cancel_at_period_end,
        ...(periodEnd ? { current_period_end: new Date(periodEnd * 1000).toISOString() } : {}),
        ...(mapped ? { subscription_status: mapped } : {}),
      };
      const userId = obj.metadata?.user_id;
      const q = db.from("profiles").update(patch);
      if (userId) await q.eq("id", userId);
      else await q.eq("stripe_customer_id", obj.customer);
    }
  } catch (e) {
    console.error("[stripe] webhook:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "handler" }, { status: 500 }); // Stripe ponowi dostarczenie
  }
  return NextResponse.json({ received: true });
}

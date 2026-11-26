import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteBase, stripeApi } from "@/lib/stripe";

// Portal klienta Stripe: zmiana karty, rezygnacja z subskrypcji, historia płatności.
export async function POST(request: Request) {
  const base = siteBase(request);
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${base}/login`, { status: 303 });

  const { data: p } = await createAdminClient().from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
  if (!p?.stripe_customer_id) return NextResponse.redirect(`${base}/konto`, { status: 303 });
  try {
    const s = await stripeApi<{ url: string }>("POST", "billing_portal/sessions", {
      customer: p.stripe_customer_id,
      return_url: `${base}/konto`,
    });
    return NextResponse.redirect(s.url, { status: 303 });
  } catch (e) {
    console.error("[stripe] portal:", e instanceof Error ? e.message : e);
    return NextResponse.redirect(`${base}/konto?platnosc=blad`, { status: 303 });
  }
}

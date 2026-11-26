import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { priceFor, siteBase, stripeApi, stripeConfigured } from "@/lib/stripe";

// Tworzy sesję Stripe Checkout (subskrypcja) dla zalogowanego użytkownika.
export async function POST(request: Request) {
  const base = siteBase(request);
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${base}/login`, { status: 303 });

  const form = await request.formData();
  const price = priceFor(String(form.get("plan") ?? ""));
  if (!stripeConfigured() || !price) return NextResponse.redirect(`${base}/konto?platnosc=niedostepna`, { status: 303 });
  // Zgoda na natychmiastowe świadczenie treści cyfrowej (utrata prawa odstąpienia) jest wymagana.
  if (form.get("consent") !== "on") return NextResponse.redirect(`${base}/konto?platnosc=zgoda`, { status: 303 });

  const db = createAdminClient();
  const { data: p } = await db.from("profiles").select("stripe_customer_id, subscription_status").eq("id", user.id).maybeSingle();
  if (p?.subscription_status === "active") return NextResponse.redirect(`${base}/konto`, { status: 303 });

  const params: Record<string, string> = {
    mode: "subscription",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    client_reference_id: user.id,
    "metadata[user_id]": user.id,
    "subscription_data[metadata][user_id]": user.id,
    locale: "pl",
    billing_address_collection: "required",
    // NIP (opcjonalny) — przy podanym NIP-ie faktura VAT idzie automatycznie (Fakturownia, kolejny krok).
    "tax_id_collection[enabled]": "true",
    success_url: `${base}/konto?platnosc=ok`,
    cancel_url: `${base}/konto?platnosc=anulowano`,
  };
  if (p?.stripe_customer_id) {
    params.customer = p.stripe_customer_id;
    params["customer_update[name]"] = "auto";
    params["customer_update[address]"] = "auto";
  } else if (user.email) params.customer_email = user.email;

  try {
    const session = await stripeApi<{ url: string }>("POST", "checkout/sessions", params);
    await db.from("profiles").update({ withdrawal_consent_at: new Date().toISOString() }).eq("id", user.id);
    return NextResponse.redirect(session.url, { status: 303 });
  } catch (e) {
    console.error("[stripe] checkout:", e instanceof Error ? e.message : e);
    return NextResponse.redirect(`${base}/konto?platnosc=blad`, { status: 303 });
  }
}

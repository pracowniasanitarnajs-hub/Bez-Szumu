import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripeApi } from "@/lib/stripe";

function baseUrl(request: Request): string {
  const u = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? u.host;
  const proto = request.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// Trwale usuwa konto zalogowanego użytkownika (auth.users; profil usuwa się kaskadowo).
export async function POST(request: Request) {
  const base = baseUrl(request);
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${base}/login`, { status: 303 });

  // Najpierw anulujemy aktywną subskrypcję Stripe, żeby nie pobierać opłat za usunięte konto.
  const admin = createAdminClient();
  const { data: p } = await admin.from("profiles").select("stripe_subscription_id").eq("id", user.id).maybeSingle();
  if (p?.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
    try {
      await stripeApi("DELETE", `subscriptions/${encodeURIComponent(p.stripe_subscription_id)}`);
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      // Subskrypcja już nie istnieje (404) — można usuwać dalej; inny błąd przerywa usuwanie.
      if (!/Stripe 404/.test(m)) {
        console.error("[konto] anulowanie subskrypcji nie powiodło się:", m);
        return NextResponse.redirect(`${base}/konto?err=1`, { status: 303 });
      }
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[konto] usuwanie nie powiodło się:", error.message);
    return NextResponse.redirect(`${base}/konto?err=1`, { status: 303 });
  }
  await supabase.auth.signOut();
  return NextResponse.redirect(`${base}/konto/usunieto`, { status: 303 });
}

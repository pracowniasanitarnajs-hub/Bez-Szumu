import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TERMS_VERSION } from "@/lib/legal";

// Adres publiczny aplikacji (za proxy Rendera request.url bywa wewnętrzny).
function baseUrl(request: Request): string {
  const u = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? u.host;
  const proto = request.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function GET(request: Request) {
  const base = baseUrl(request);
  const code = new URL(request.url).searchParams.get("code");
  if (!code) return NextResponse.redirect(`${base}/login?err=1`);

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${base}/login?err=1`);

  // Wymagana zgoda na aktualną wersję Regulaminu i Polityki prywatności.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const jar = await cookies();
  const accepted = jar.get("bs_terms")?.value === TERMS_VERSION;

  if (user) {
    try {
      const db = createAdminClient();
      const { data: profile, error: pErr } = await db
        .from("profiles")
        .select("terms_version")
        .eq("id", user.id)
        .maybeSingle();

      if (pErr) {
        // Brak kolumn (migracja 0003 jeszcze niewykonana): nie blokujemy logowania.
        console.error("[auth] terms check skipped:", pErr.message);
      } else if (profile?.terms_version !== TERMS_VERSION) {
        if (!accepted) {
          // Użytkownik nie zaakceptował dokumentów (np. ominął formularz): wylogowanie.
          await supabase.auth.signOut();
          return NextResponse.redirect(`${base}/login?err=terms`);
        }
        await db
          .from("profiles")
          .update({ terms_accepted_at: new Date().toISOString(), terms_version: TERMS_VERSION })
          .eq("id", user.id);
      }
    } catch (e) {
      console.error("[auth] terms save failed:", e instanceof Error ? e.message : e);
    }
  }

  const res = NextResponse.redirect(`${base}/`);
  res.cookies.delete("bs_terms");
  return res;
}

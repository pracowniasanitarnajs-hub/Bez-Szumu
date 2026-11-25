import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[konto] usuwanie nie powiodło się:", error.message);
    return NextResponse.redirect(`${base}/konto?err=1`, { status: 303 });
  }
  await supabase.auth.signOut();
  return NextResponse.redirect(`${base}/konto/usunieto`, { status: 303 });
}

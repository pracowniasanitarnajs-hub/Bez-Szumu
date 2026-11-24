import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

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
  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${base}/`);
  }
  return NextResponse.redirect(`${base}/login?err=1`);
}

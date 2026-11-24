import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  const u = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? u.host;
  const proto = request.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return NextResponse.redirect(`${proto}://${host}/`, { status: 303 });
}

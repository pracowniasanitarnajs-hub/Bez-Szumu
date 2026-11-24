import { createSupabaseServer } from "@/lib/supabase/server";

export type Access =
  | { level: "guest" }
  | { level: "trial"; email: string | null; daysLeft: number; isAdmin: boolean }
  | { level: "active"; email: string | null; isAdmin: boolean }
  | { level: "expired"; email: string | null; isAdmin: boolean };

// Ustalamy dostęp na serwerze z profilu użytkownika (tabela profiles, reguły RLS: tylko własny wiersz).
export async function getAccess(): Promise<Access> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { level: "guest" };

  const { data: p } = await supabase
    .from("profiles")
    .select("subscription_status, trial_ends_at, is_admin, current_period_end")
    .eq("id", user.id)
    .maybeSingle();

  const email = user.email ?? null;
  const isAdmin = !!p?.is_admin;
  if (!p) return { level: "expired", email, isAdmin }; // brak profilu: bezpieczniej nie dawać dostępu

  if (isAdmin || p.subscription_status === "active") return { level: "active", email, isAdmin };

  if (p.subscription_status === "trialing") {
    const ms = new Date(p.trial_ends_at).getTime() - Date.now();
    if (ms > 0) return { level: "trial", email, isAdmin, daysLeft: Math.max(1, Math.ceil(ms / 86400e3)) };
  }
  return { level: "expired", email, isAdmin };
}

export function hasFullAccess(a: Access): boolean {
  return a.level === "trial" || a.level === "active";
}

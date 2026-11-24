import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Klient Supabase działający w imieniu zalogowanego użytkownika (sesja z ciasteczek). Podlega RLS.
export async function createSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Brak NEXT_PUBLIC_SUPABASE_URL lub NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(list) {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          // Wywołane z Server Component — ciasteczka odświeża proxy, więc można zignorować.
        }
      },
    },
  });
}

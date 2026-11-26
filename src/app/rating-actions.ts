"use server";

import { updateTag } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Zapis (lub usunięcie, gdy score = null) oceny zalogowanego użytkownika.
export async function rateVideo(videoId: string, score: number | null): Promise<{ ok: boolean; error?: string }> {
  const { data } = await (await createSupabaseServer()).auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { ok: false, error: "Zaloguj się, aby ocenić." };
  if (!/^[0-9a-f-]{36}$/i.test(videoId)) return { ok: false, error: "Nieprawidłowy film." };
  if (score !== null && !(Number.isInteger(score) && score >= 1 && score <= 10)) return { ok: false, error: "Ocena 1–10." };

  const db = createAdminClient();
  const { data: v } = await db.from("videos").select("id").eq("id", videoId).eq("status", "published").maybeSingle();
  if (!v) return { ok: false, error: "Film niedostępny." };

  const { error } =
    score === null
      ? await db.from("user_ratings").delete().eq("video_id", videoId).eq("user_id", userId)
      : await db
          .from("user_ratings")
          .upsert({ video_id: videoId, user_id: userId, score, updated_at: new Date().toISOString() });
  if (error) {
    console.error("[ratings]", error.message);
    return { ok: false, error: "Nie udało się zapisać oceny." };
  }
  updateTag("ratings");
  return { ok: true };
}

import { cacheLife, cacheTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export type RatingStats = Record<string, { avg: number; count: number }>;

// Średnie ocen użytkowników per film (wspólne dla wszystkich, odświeżane po każdej nowej ocenie).
export async function getRatingStats(): Promise<RatingStats> {
  "use cache";
  cacheLife("minutes");
  cacheTag("ratings");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return {};
  const { data, error } = await createAdminClient().from("user_ratings").select("video_id, score").limit(50000);
  if (error || !data) return {}; // np. tabela jeszcze nie istnieje (migracja 0006)
  const acc: Record<string, { sum: number; count: number }> = {};
  for (const r of data) {
    const a = (acc[r.video_id] ??= { sum: 0, count: 0 });
    a.sum += r.score;
    a.count++;
  }
  return Object.fromEntries(Object.entries(acc).map(([id, a]) => [id, { avg: Math.round((a.sum / a.count) * 10) / 10, count: a.count }]));
}

// Oceny wystawione przez danego użytkownika (video_id -> ocena).
export async function getMyRatings(userId: string): Promise<Record<string, number>> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return {};
  const { data, error } = await createAdminClient().from("user_ratings").select("video_id, score").eq("user_id", userId);
  if (error || !data) return {};
  return Object.fromEntries(data.map((r) => [r.video_id, r.score]));
}

import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export type ChannelInfo = {
  id: string;
  name: string;
  handle: string | null;
  youtubeUrl: string;
  videoCount: number; // opublikowane, ocenione wywiady
  avgScore: number | null;
  bestScore: number | null;
  lastPublishedAt: string | null;
};

export async function getChannels(): Promise<ChannelInfo[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("ranking");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];

  // Ta sama zasada co w rankingu: do czasu wdrożenia logowania pokazujemy pełne dane.
  const showAll = process.env.PUBLIC_SHOW_ALL !== "false" && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const db = showAll ? createAdminClient() : createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await db
    .from("channels")
    .select("id, name, handle, youtube_channel_id, videos(status, published_at, analyses(ai_score, editor_score))")
    .eq("active", true)
    .order("created_at");
  if (error || !data) return [];

  return data
    .map((c: any) => {
      const scores: number[] = [];
      let last: string | null = null;
      for (const v of c.videos ?? []) {
        if (v.status !== "published") continue;
        const a = Array.isArray(v.analyses) ? v.analyses[0] : v.analyses;
        if (!a) continue;
        scores.push(Number(a.editor_score ?? a.ai_score));
        if (!last || v.published_at > last) last = v.published_at;
      }
      const avg = scores.length ? scores.reduce((s, x) => s + x, 0) / scores.length : null;
      return {
        id: c.id,
        name: c.name,
        handle: c.handle ?? null,
        youtubeUrl: `https://www.youtube.com/channel/${c.youtube_channel_id}`,
        videoCount: scores.length,
        avgScore: avg === null ? null : Math.round(avg * 10) / 10,
        bestScore: scores.length ? Math.max(...scores) : null,
        lastPublishedAt: last,
      } satisfies ChannelInfo;
    })
    .sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0));
}

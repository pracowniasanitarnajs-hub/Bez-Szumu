import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";

export type RankedVideo = {
  id: string;
  youtubeVideoId: string;
  title: string;
  channel: string;
  publishedAt: string;
  durationSeconds: number | null;
  score: number;
  clickbait: "Niski" | "Średni" | "Wysoki";
  clickbaitNote: string;
  guest: string | null;
  summary: string[];
  timestamps: { t: number; label: string }[];
  tags: string[];
  editorComment: string | null;
};

export const DEMO: RankedVideo[] = [
  {
    id: "demo-1",
    youtubeVideoId: "dQw4w9WgXcQ",
    title: "Przykład: Bałtyk jako teatr działań — co naprawdę zmienia NATO?",
    channel: "Kanał przykładowy",
    publishedAt: new Date().toISOString(),
    durationSeconds: 3480,
    score: 9.1,
    clickbait: "Niski",
    clickbaitNote: "Tytuł odpowiada głównemu wątkowi rozmowy.",
    guest: "Dr Jan Przykładowy",
    summary: [
      "Rozmówca omawia konkretne liczby okrętów i systemów obrony wybrzeża na Bałtyku.",
      "Wskazuje na różnice między planami sojuszu a realnymi zdolnościami.",
      "Zwraca uwagę na rolę infrastruktury krytycznej na dnie morza.",
    ],
    timestamps: [
      { t: 120, label: "Stan sił na Bałtyku" },
      { t: 1260, label: "Infrastruktura podmorska" },
      { t: 2700, label: "Scenariusze na 2030" },
    ],
    tags: ["#Bałtyk", "#NATO", "#Wojsko"],
    editorComment: null,
  },
];

export async function getRanking(): Promise<{ items: RankedVideo[]; demo: boolean }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("ranking");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { items: DEMO, demo: true };

  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await db
    .from("videos")
    .select(
      "id, youtube_video_id, title, published_at, duration_seconds, channels(name), analyses(ai_score, editor_score, clickbait_level, clickbait_note, summary, timestamps, guest, tags, editor_comment)",
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(30);
  if (error || !data) return { items: [], demo: false };

  const items: RankedVideo[] = data.flatMap((v: any) => {
    const a = Array.isArray(v.analyses) ? v.analyses[0] : v.analyses;
    if (!a) return [];
    return [
      {
        id: v.id,
        youtubeVideoId: v.youtube_video_id,
        title: v.title,
        channel: v.channels?.name ?? "",
        publishedAt: v.published_at,
        durationSeconds: v.duration_seconds,
        score: Number(a.editor_score ?? a.ai_score),
        clickbait: a.clickbait_level,
        clickbaitNote: a.clickbait_note ?? "",
        guest: a.guest,
        summary: a.summary ?? [],
        timestamps: a.timestamps ?? [],
        tags: a.tags ?? [],
        editorComment: a.editor_comment,
      },
    ];
  });
  return { items, demo: false };
}

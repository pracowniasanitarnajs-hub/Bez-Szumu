import { createAdminClient } from "@/lib/supabase/admin";
import { fetchChannelFeed } from "./rss";
import { fetchVideoMeta } from "./youtube";
import { fetchTranscript, transcriptToPromptText } from "./transcript";
import { analyzeTranscript } from "./analyze";

const MAX_ATTEMPTS = 3;

export type ProcessReport = {
  discovered: number;
  skipped: number;
  queued: number;
  processed: number;
  failed: number;
  errors: string[];
};

export async function processVideos(): Promise<ProcessReport> {
  const db = createAdminClient();
  const minDuration = parseInt(process.env.MIN_DURATION_SECONDS ?? "1200", 10);
  const batchSize = parseInt(process.env.BATCH_SIZE ?? "5", 10);
  const autoPublish = process.env.AUTO_PUBLISH === "true";
  const report: ProcessReport = { discovered: 0, skipped: 0, queued: 0, processed: 0, failed: 0, errors: [] };

  // 1) RSS -> nowe filmy (status discovered). Błąd jednego kanału nie przerywa reszty.
  const { data: channels, error: chErr } = await db.from("channels").select("id, youtube_channel_id, name").eq("active", true);
  if (chErr) throw chErr;
  for (const ch of channels ?? []) {
    try {
      const feed = await fetchChannelFeed(ch.youtube_channel_id);
      if (feed.length === 0) continue;
      const ids = feed.map((v) => v.youtubeVideoId);
      const { data: existing } = await db.from("videos").select("youtube_video_id").in("youtube_video_id", ids);
      const known = new Set((existing ?? []).map((e) => e.youtube_video_id));
      const fresh = feed.filter((v) => !known.has(v.youtubeVideoId));
      if (fresh.length === 0) continue;
      const { error } = await db.from("videos").insert(
        fresh.map((v) => ({
          channel_id: ch.id,
          youtube_video_id: v.youtubeVideoId,
          title: v.title,
          published_at: v.publishedAt,
          thumbnail_url: v.thumbnailUrl,
          status: "discovered",
        })),
      );
      if (error) throw error;
      report.discovered += fresh.length;
    } catch (e) {
      report.errors.push(`RSS ${ch.name}: ${msg(e)}`);
    }
  }

  // 2) Długość filmu -> skipped / queued.
  try {
    const { data: discovered } = await db.from("videos").select("id, youtube_video_id").eq("status", "discovered").limit(100);
    if (discovered && discovered.length > 0) {
      const meta = await fetchVideoMeta(discovered.map((d) => d.youtube_video_id));
      for (const v of discovered) {
        const m = meta.get(v.youtube_video_id);
        if (!m) {
          await db.from("videos").update({ status: "skipped", error: "Brak metadanych (usunięty/prywatny?)" }).eq("id", v.id);
          report.skipped++;
          continue;
        }
        const skip = m.isLiveOrUpcoming || m.durationSeconds < minDuration;
        await db
          .from("videos")
          .update({ duration_seconds: m.durationSeconds, status: skip ? "skipped" : "queued", updated_at: new Date().toISOString() })
          .eq("id", v.id);
        skip ? report.skipped++ : report.queued++;
      }
    }
  } catch (e) {
    report.errors.push(`Metadane: ${msg(e)}`);
  }

  // 3) Paczka kolejki: transkrypcja -> AI -> zapis. Błąd per film.
  const { data: batch } = await db
    .from("videos")
    .select("id, youtube_video_id, title, duration_seconds, attempts, channels(name)")
    .eq("status", "queued")
    .order("published_at", { ascending: false })
    .limit(batchSize);

  for (const v of batch ?? []) {
    await db.from("videos").update({ status: "processing", updated_at: new Date().toISOString() }).eq("id", v.id);
    try {
      const segments = await fetchTranscript(v.youtube_video_id);
      const channelName = (v as any).channels?.name ?? "";
      const { analysis, model } = await analyzeTranscript({
        title: v.title,
        channelName,
        durationSeconds: v.duration_seconds ?? 0,
        transcriptText: transcriptToPromptText(segments),
      });
      const { error: aErr } = await db.from("analyses").upsert({
        video_id: v.id,
        ai_score: analysis.score,
        clickbait_level: analysis.clickbaitLevel,
        clickbait_note: analysis.clickbaitNote,
        summary: analysis.summary,
        timestamps: analysis.timestamps,
        guest: analysis.guest,
        tags: analysis.tags,
        model,
      });
      if (aErr) throw aErr;
      await db
        .from("videos")
        .update({ status: autoPublish ? "published" : "pending", error: null, updated_at: new Date().toISOString() })
        .eq("id", v.id);
      report.processed++;
    } catch (e) {
      const attempts = (v.attempts ?? 0) + 1;
      await db
        .from("videos")
        .update({
          status: attempts >= MAX_ATTEMPTS ? "failed" : "queued",
          attempts,
          error: msg(e).slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq("id", v.id);
      report.failed++;
      report.errors.push(`${v.youtube_video_id}: ${msg(e)}`);
    }
  }

  return report;
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

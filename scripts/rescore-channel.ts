// Ponowna ocena (nową skalą: 5 kryteriów) filmów jednego kanału, które mają jeszcze starą ocenę (criteria = null).
// Uruchomienie: npx tsx --env-file=.env.local scripts/rescore-channel.ts "Historia Realna" [--run]
// Bez --run tylko wypisuje listę. Status filmu się nie zmienia, chyba że nowa ocena wymaga akceptacji redaktora.
import { createAdminClient } from "../src/lib/supabase/admin";
import { fetchTranscript, transcriptToPromptText } from "../src/lib/pipeline/transcript";
import { analyzeTranscript } from "../src/lib/pipeline/analyze";

const channelName = process.argv[2];
const run = process.argv.includes("--run");
if (!channelName) throw new Error("Podaj nazwę kanału");

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function main() {
  const db = createAdminClient();
  const reviewBelow = parseFloat(process.env.REVIEW_BELOW_SCORE ?? "4");
  const { data: ch } = await db.from("channels").select("id, name").ilike("name", channelName).maybeSingle();
  if (!ch) throw new Error(`Nie znaleziono kanału ${channelName}`);

  const { data: rows, error } = await db
    .from("analyses")
    .select("video_id, ai_score, clickbait_level, videos!inner(id, youtube_video_id, title, status, duration_seconds, channel_id)")
    .is("criteria", null)
    .eq("videos.channel_id", ch.id)
    .in("videos.status", ["published", "pending"]);
  if (error) throw error;
  const todo = (rows ?? []) as any[];
  console.log(`${ch.name}: ${todo.length} filmów na starej skali`);
  for (const r of todo) console.log(`  ${Number(r.ai_score).toFixed(1)}  [${r.videos.status}]  ${r.videos.title}`);
  if (!run) return;

  const results: { title: string; before: number; after: number }[] = [];
  let first = true;
  for (const r of todo) {
    if (!first) await new Promise((res) => setTimeout(res, 3000));
    first = false;
    const v = r.videos;
    try {
      const segments = await fetchTranscript(v.youtube_video_id);
      const { analysis, model } = await analyzeTranscript({
        title: v.title,
        channelName: ch.name,
        durationSeconds: v.duration_seconds ?? 0,
        transcriptText: transcriptToPromptText(segments),
      });
      const { error: uErr } = await db
        .from("analyses")
        .update({
          ai_score: analysis.score,
          criteria: analysis.criteria,
          clickbait_level: analysis.clickbaitLevel,
          clickbait_note: analysis.clickbaitNote,
          summary: analysis.summary,
          timestamps: analysis.timestamps,
          guest: analysis.guest,
          tags: analysis.tags,
          format: analysis.format,
          noise_percent: analysis.noisePercent,
          model,
        })
        .eq("video_id", r.video_id);
      if (uErr) throw uErr;
      const needsReview = analysis.score < reviewBelow || analysis.clickbaitLevel === "Wysoki";
      if (v.status === "published" && needsReview) {
        await db.from("videos").update({ status: "pending", updated_at: new Date().toISOString() }).eq("id", v.id);
        console.log(`  -> do akceptacji w /admin`);
      }
      results.push({ title: v.title, before: Number(r.ai_score), after: analysis.score });
      console.log(`OK ${Number(r.ai_score).toFixed(1)} -> ${analysis.score.toFixed(1)}  ${v.title}`);
    } catch (e) {
      console.log(`BŁĄD ${v.youtube_video_id}: ${msg(e)}`);
      if (/HTTP (402|403|429)|credit|insufficient/i.test(msg(e))) {
        console.log("Przerywam: brak kredytów lub limit.");
        break;
      }
    }
  }
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  console.log(`\nPrzeliczono ${results.length}/${todo.length}. Średnia: ${avg(results.map((r) => r.before)).toFixed(2)} -> ${avg(results.map((r) => r.after)).toFixed(2)}`);
}

main().catch((e) => {
  console.error(msg(e));
  process.exit(1);
});

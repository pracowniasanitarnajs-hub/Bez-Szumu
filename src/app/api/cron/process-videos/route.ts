import { timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { processVideos } from "@/lib/pipeline/process";
import { ensureDailyPost } from "@/lib/social/daily-post";

export const maxDuration = 300;

function authorized(req: Request): boolean {
  // trim(): przy wklejaniu do panelu Rendera łatwo dołączyć niewidoczną spację lub nową linię.
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Odpowiada od razu (202), a przetwarzanie trwa w tle. Dzięki temu połączenie crona nie jest
// zrywane przez serwery pośredniczące, gdy ocena kilku filmów trwa kilka minut.
// Wynik zapisywany jest w logach usługi (Render → Logs).
export async function POST(req: Request) {
  if (!authorized(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  after(async () => {
    const started = Date.now();
    try {
      const report = await processVideos();
      console.log("[cron] OK", JSON.stringify({ ...report, seconds: Math.round((Date.now() - started) / 1000) }));
    } catch (e) {
      console.error("[cron] BŁĄD", e instanceof Error ? e.message : String(e));
    }
    // Raz dziennie (po 8:00): szkic posta na Facebooka z rankingiem wczorajszych wywiadów.
    try {
      const r = await ensureDailyPost();
      if (r !== "za wcześnie" && !r.startsWith("już jest")) console.log("[social] post dzienny:", r);
    } catch (e) {
      console.error("[social] BŁĄD", e instanceof Error ? e.message : String(e));
    }
  });

  return Response.json({ ok: true, accepted: true }, { status: 202 });
}

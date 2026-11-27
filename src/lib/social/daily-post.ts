import { createAdminClient } from "@/lib/supabase/admin";
import { facebookConfigured, publishToFacebook } from "./facebook";

const TOP = 5;
// Adres w poście: nigdy localhost (np. przy testach lokalnych).
const envSite = process.env.NEXT_PUBLIC_SITE_URL ?? "";
const SITE = (/^https:\/\//.test(envSite) && !envSite.includes("localhost") ? envSite : "https://bez-szumu.pl").replace(/\/$/, "");

// Dzień kalendarzowy w Polsce (RRRR-MM-DD).
export function warsawDay(ms: number): string {
  return new Date(ms).toLocaleDateString("sv-SE", { timeZone: "Europe/Warsaw" });
}

function warsawHour(ms: number): number {
  return parseInt(new Date(ms).toLocaleString("en-GB", { timeZone: "Europe/Warsaw", hour: "2-digit", hour12: false }), 10);
}

export function yesterdayWarsaw(now = Date.now()): string {
  return warsawDay(now - 86400e3);
}

const fmtScore = (n: number) => n.toFixed(1).replace(".", ",");
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
// Skraca do pełnych zdań (bez urywania w połowie); gdy pierwsze zdanie jest za długie — zwykłe cięcie.
function cutSentences(s: string, n: number): string {
  if (s.length <= n) return s;
  const head = s.slice(0, n);
  const end = Math.max(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "));
  return end > 80 ? head.slice(0, end + 1) : cut(s, n);
}

// Buduje treść posta z rankingiem filmów opublikowanych na YouTube danego dnia (tylko pozytywne wyróżnienia: TOP 5).
export async function buildDailyPost(day: string): Promise<{ message: string; link: string } | null> {
  const db = createAdminClient();
  const from = new Date(Date.parse(day + "T00:00:00Z") - 86400e3).toISOString();
  const to = new Date(Date.parse(day + "T00:00:00Z") + 2 * 86400e3).toISOString();
  const { data, error } = await db
    .from("videos")
    .select("youtube_video_id, title, published_at, channels(name), analyses(ai_score, editor_score, guest, summary)")
    .eq("status", "published")
    .gte("published_at", from)
    .lt("published_at", to);
  if (error) throw error;

  const items = (data ?? [])
    .filter((v: any) => warsawDay(new Date(v.published_at).getTime()) === day)
    .flatMap((v: any) => {
      const a = Array.isArray(v.analyses) ? v.analyses[0] : v.analyses;
      if (!a) return [];
      return [
        {
          id: v.youtube_video_id as string,
          title: v.title as string,
          channel: (v.channels?.name ?? "") as string,
          guest: (a.guest ?? null) as string | null,
          score: Number(a.editor_score ?? a.ai_score),
          summary: (a.summary ?? []) as string[],
        },
      ];
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP);
  if (items.length === 0) return null;

  const [y, m, d] = day.split("-");
  const best = items[0];
  // Hook (pierwsze linijki widać przed „Zobacz więcej"). Gdy AI zawiedzie — prosty nagłówek.
  const hook = (await makeHook(best).catch(() => null)) ?? `Który wywiad z wczoraj naprawdę warto obejrzeć? 👇`;
  const lines = [
    hook,
    "",
    `⭐ Wywiad dnia: ${cut(best.title, 110)} (${best.channel}, ${fmtScore(best.score)}/10)`,
    cutSentences(best.summary[0] ?? "", 320),
    "",
    `📊 TOP ${items.length} z ${d}.${m}.${y}:`,
    "",
    items.map((v, i) => `${i + 1}. ${fmtScore(v.score)}/10 · ${v.channel}${v.guest ? ` · ${cut(v.guest, 60)}` : ""}\n${cut(v.title, 110)}`).join("\n\n"),
    "",
    `Pełny ranking, wnioski i spis treści z minutami: ${SITE}`,
    "Oceny powstają automatycznie na podstawie treści rozmów.",
    "",
    "#geopolityka #wywiady #BezSzumu",
  ];
  return { message: lines.join("\n").replace(/\n{3,}/g, "\n\n"), link: `https://www.youtube.com/watch?v=${best.id}` };
}

const HOOK_RULES = `Piszesz pierwsze 1–2 zdania posta na Facebooku serwisu „Bez Szumu", który poleca merytoryczne polskie wywiady geopolityczne.
Cel: zatrzymać przewijanie i zachęcić do przeczytania posta, ale BEZ clickbaitu — to marka przeciw clickbaitom.
Zasady:
- Max 170 znaków łącznie. Po polsku, naturalnie, bez wielkich liter dla efektu, max 1 wykrzyknik, max 1 emoji (na końcu lub wcale).
- Oprzyj się na najciekawszym KONKRECIE z podsumowania (liczba, zaskakująca teza, prognoza, mało znany fakt). Możesz użyć pytania.
- Tezy przypisuj rozmówcy („Zdaniem …", „Gość przekonuje, że…"). Nie przedstawiaj opinii jako faktów.
- Nie oceniaj ludzi ani ich intencji, bez słów typu: szok, kłamstwo, manipulacja, skandal, musisz zobaczyć.
- Nie cytuj dosłownie tytułu filmu. Bez hashtagów i linków.
Zwróć WYŁĄCZNIE tekst hooka.`;

async function makeHook(v: { title: string; channel: string; guest: string | null; summary: string[] }): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.AI_MODEL || "claude-sonnet-5-5",
      max_tokens: 1500,
      system: HOOK_RULES,
      messages: [
        {
          role: "user",
          content: `Kanał: ${v.channel}\nRozmówca: ${v.guest ?? "brak danych"}\nTytuł: ${v.title}\nPodsumowanie:\n- ${v.summary.join("\n- ")}`,
        },
      ],
    }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json();
  // Odpowiedź może zaczynać się blokiem „thinking" — bierzemy blok tekstowy.
  const block = (json.content ?? []).find((c: any) => c.type === "text");
  const text = String(block?.text ?? "").trim().replace(/^["„]|["”]$/g, "");
  return text && text.length <= 220 ? text : null;
}

// Wywoływane przez cron: raz dziennie (po godzinie FB_POST_HOUR, domyślnie 8) tworzy szkic posta za wczoraj.
// FB_AUTO_PUBLISH=true publikuje od razu; inaczej szkic czeka na akceptację w /admin.
export async function ensureDailyPost(opts: { force?: boolean } = {}): Promise<string> {
  const now = Date.now();
  const hour = parseInt(process.env.FB_POST_HOUR ?? "8", 10);
  if (!opts.force && warsawHour(now) < hour) return "za wcześnie";
  const day = yesterdayWarsaw(now);
  const db = createAdminClient();
  const { data: existing } = await db.from("social_posts").select("id, status").eq("platform", "facebook").eq("day", day).maybeSingle();
  if (existing) return `już jest (${existing.status})`;

  const post = await buildDailyPost(day);
  if (!post) {
    await db.from("social_posts").insert({ platform: "facebook", day, message: "(brak filmów tego dnia)", status: "skipped" });
    return "brak filmów";
  }
  const { data: row, error } = await db
    .from("social_posts")
    .insert({ platform: "facebook", day, message: post.message, link: post.link, status: "draft" })
    .select("id")
    .single();
  if (error) throw error;

  if (process.env.FB_AUTO_PUBLISH === "true" && facebookConfigured()) {
    await publishPost(row.id);
    return "opublikowano";
  }
  return "szkic";
}

// Generuje treść szkicu od nowa (nowy hook z AI, aktualne oceny). Opublikowanych postów nie rusza.
export async function rebuildPost(id: string): Promise<string> {
  const db = createAdminClient();
  const { data: p, error } = await db.from("social_posts").select("day, status").eq("id", id).single();
  if (error) throw error;
  if (p.status === "published") return "post jest już opublikowany";
  const post = await buildDailyPost(p.day);
  if (!post) return "brak filmów z tego dnia";
  const { error: e2 } = await db
    .from("social_posts")
    .update({ message: post.message, link: post.link, status: "draft", error: null })
    .eq("id", id);
  if (e2) throw e2;
  return "wygenerowano od nowa";
}

export async function publishPost(id: string): Promise<void> {
  const db = createAdminClient();
  const { data: p, error } = await db.from("social_posts").select("message, link, status").eq("id", id).single();
  if (error) throw error;
  if (p.status === "published") return;
  try {
    const externalId = await publishToFacebook(p.message, p.link);
    await db
      .from("social_posts")
      .update({ status: "published", external_id: externalId, error: null, published_at: new Date().toISOString() })
      .eq("id", id);
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    await db.from("social_posts").update({ status: "failed", error: m.slice(0, 500) }).eq("id", id);
    throw e;
  }
}

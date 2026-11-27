import { Suspense } from "react";
import type { Metadata } from "next";
import { isAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { facebookConfigured } from "@/lib/social/facebook";
import { warsawDay } from "@/lib/social/daily-post";
import { getPollForAdmin, monthLabel, pollMonth, previousMonth } from "@/lib/channel-poll";
import { addChannel, createPostNow, login, logout, runNow, saveEditor, savePost, setStatus, setSuggestionStatus, toggleChannel } from "./actions";

const POST_STATUS: Record<string, string> = {
  draft: "Szkic — czeka na akceptację",
  published: "Opublikowany",
  skipped: "Pominięty",
  failed: "Błąd publikacji",
};

export const metadata: Metadata = { title: "Panel admina — Bez Szumu", robots: { index: false, follow: false } };
export const maxDuration = 300;

type SP = { [k: string]: string | string[] | undefined };

export default function AdminPage(props: { searchParams: Promise<SP> }) {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
      <Suspense fallback={<p className="text-muted">Ładowanie…</p>}>
        <Content searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

const btn =
  "inline-flex min-h-10 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium hover:border-accent";
const btnPrimary =
  "inline-flex min-h-10 items-center justify-center rounded-lg bg-accent px-3 text-sm font-semibold text-white dark:text-slate-900";
const input = "min-h-10 rounded-lg border border-border bg-background px-3 text-sm";
const chip = (on: boolean) =>
  `inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm ${
    on ? "border-accent bg-accent text-white dark:text-slate-900 font-semibold" : "border-border hover:border-accent"
  }`;
const badge = (on: boolean) => `rounded-full px-1.5 text-xs ${on ? "bg-white/25" : "bg-accent/10 text-accent"}`;

const TABS = [
  { key: "filmy", label: "Filmy" },
  { key: "facebook", label: "Facebook" },
  { key: "kanaly", label: "Kanały i ankieta" },
  { key: "uzytkownicy", label: "Użytkownicy" },
] as const;

const STATUS_TABS = [
  { key: "oczekuje", label: "Do akceptacji" },
  { key: "recznie", label: "Zaakceptowane przez Ciebie" },
  { key: "auto", label: "Opublikowane automatycznie" },
  { key: "problemy", label: "Błędy i kolejka" },
] as const;

const PERIODS = [
  { key: "wczoraj", label: "Od wczoraj" },
  { key: "tydzien", label: "7 dni" },
  { key: "miesiac", label: "30 dni" },
  { key: "wszystkie", label: "Wszystkie" },
] as const;

const PAGE = 50;

function href(p: Record<string, string | undefined>) {
  const q = new URLSearchParams(Object.entries(p).filter(([, v]) => v) as [string, string][]);
  return `/admin?${q.toString()}`;
}

async function Content({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;

  if (!(await isAdmin())) {
    return (
      <form action={login} className="mx-auto mt-16 flex max-w-sm flex-col gap-3">
        <h1 className="text-xl font-bold">Panel admina</h1>
        <input name="password" type="password" placeholder="Hasło" autoComplete="current-password" required className={input} />
        <button className={btnPrimary}>Zaloguj</button>
        {sp.err && <p className="text-sm text-rose-600">Nieprawidłowe hasło.</p>}
      </form>
    );
  }

  const tab = (TABS.find((t) => t.key === sp.tab)?.key ?? "filmy") as (typeof TABS)[number]["key"];
  const db = createAdminClient();

  // Lekkie dane do liczników na zakładkach (zawsze).
  const [{ data: light }, { data: draftPosts }] = await Promise.all([
    db
      .from("videos")
      .select("id, status, published_at, analyses(ai_score, clickbait_level)")
      .in("status", ["pending", "published", "failed", "queued", "processing"])
      .limit(5000),
    db.from("social_posts").select("id").in("status", ["draft", "failed"]),
  ]);
  const pendingCount = (light ?? []).filter((v) => v.status === "pending").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Panel admina</h1>
        <div className="flex gap-2">
          <a href="/" className={btn}>Strona główna</a>
          <form action={logout}><button className={btn}>Wyloguj</button></form>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2 border-b border-border pb-3" aria-label="Sekcje panelu">
        {TABS.map((t) => {
          const n = t.key === "filmy" ? pendingCount : t.key === "facebook" ? (draftPosts ?? []).length : 0;
          return (
            <a key={t.key} href={href({ tab: t.key })} className={chip(tab === t.key)} aria-current={tab === t.key ? "page" : undefined}>
              {t.label}
              {n > 0 && <span className={badge(tab === t.key)}>{n}</span>}
            </a>
          );
        })}
      </nav>

      {sp.msg && <p className="rounded-lg bg-accent/10 p-3 text-sm">{String(sp.msg)}</p>}

      {tab === "filmy" && <VideosTab sp={sp} light={(light ?? []) as any[]} />}
      {tab === "facebook" && <FacebookTab />}
      {tab === "kanaly" && <ChannelsTab />}
      {tab === "uzytkownicy" && <UsersTab />}
    </div>
  );
}

// ===================== Filmy =====================
const threshold = () => Number(process.env.REVIEW_BELOW_SCORE ?? "4");
const one = (a: any) => (Array.isArray(a) ? a[0] : a);
// Film, który przy ocenie trafił do akceptacji (niska ocena lub wysoki clickbait).
const wasHeld = (a: any) => !!a && (Number(a.ai_score) < threshold() || a.clickbait_level === "Wysoki");

function statusGroup(v: any): (typeof STATUS_TABS)[number]["key"] {
  if (v.status === "pending") return "oczekuje";
  if (v.status === "published") return wasHeld(one(v.analyses)) ? "recznie" : "auto";
  return "problemy";
}

function inPeriod(v: any, okres: string, now: number): boolean {
  if (okres === "wszystkie") return true;
  if (!v.published_at) return false;
  const t = new Date(v.published_at).getTime();
  if (okres === "wczoraj") return warsawDay(t) >= warsawDay(now - 86400e3);
  return now - t <= (okres === "tydzien" ? 7 : 30) * 86400e3;
}

async function VideosTab({ sp, light }: { sp: SP; light: any[] }) {
  const st = (STATUS_TABS.find((s) => s.key === sp.st)?.key ?? "oczekuje") as (typeof STATUS_TABS)[number]["key"];
  const okres = (PERIODS.find((p) => p.key === sp.okres)?.key ?? (st === "oczekuje" ? "wszystkie" : "tydzien")) as string;
  const now = Date.now();

  const statusCount = (k: string) => light.filter((v) => statusGroup(v) === k && inPeriod(v, okres, now)).length;
  const periodCount = (k: string) => light.filter((v) => statusGroup(v) === st && inPeriod(v, k, now)).length;
  const matching = light
    .filter((v) => statusGroup(v) === st && inPeriod(v, okres, now))
    .sort((a, b) => String(b.published_at ?? "").localeCompare(String(a.published_at ?? "")));
  const ids = matching.slice(0, PAGE).map((v) => v.id);

  const { data: full } = ids.length
    ? await createAdminClient()
        .from("videos")
        .select(
          "id, title, status, duration_seconds, published_at, error, youtube_video_id, channels(name), analyses(ai_score, editor_score, editor_comment, clickbait_level, guest, tags, summary, created_at)",
        )
        .in("id", ids)
    : { data: [] as any[] };
  const byId = new Map((full ?? []).map((v: any) => [v.id, v]));
  const list = ids.map((id) => byId.get(id)).filter(Boolean);

  const counts: Record<string, number> = {};
  for (const v of light) counts[v.status] = (counts[v.status] ?? 0) + 1;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3">
        <p className="text-sm text-muted">
          {Object.entries(counts).map(([k, n]) => `${k}: ${n}`).join(" · ") || "brak filmów"}
        </p>
        <form action={runNow}>
          <button className={btn} title="Trwa do kilku minut (pobiera transkrypcje i ocenia do 5 filmów).">Sprawdź nowości teraz</button>
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((s) => (
          <a key={s.key} href={href({ tab: "filmy", st: s.key, okres: sp.okres ? okres : undefined })} className={chip(st === s.key)}>
            {s.label} <span className={badge(st === s.key)}>{statusCount(s.key)}</span>
          </a>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <a key={p.key} href={href({ tab: "filmy", st, okres: p.key })} className={chip(okres === p.key)}>
            {p.label} <span className={badge(okres === p.key)}>{periodCount(p.key)}</span>
          </a>
        ))}
      </div>

      <p className="text-xs text-muted">
        {st === "oczekuje" && "Wstrzymane przy ocenie: niska ocena AI lub clickbait „Wysoki”. Daty liczone od publikacji filmu na YouTube."}
        {st === "recznie" && "Opublikowane filmy, które przy ocenie trafiły do akceptacji (niska ocena lub wysoki clickbait)."}
        {st === "auto" && "Filmy, które weszły na stronę same (AUTO_PUBLISH)."}
        {st === "problemy" && "Filmy z błędem przetwarzania albo czekające w kolejce."}
        {matching.length > PAGE && ` Pokazano ${PAGE} najnowszych z ${matching.length} — zawęź okres.`}
      </p>

      {list.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted">Brak filmów w tym widoku.</p>
      ) : (
        <div className="space-y-2">
          {list.map((v: any) => (
            <VideoRow key={v.id} v={v} />
          ))}
        </div>
      )}
    </section>
  );
}

function VideoRow({ v }: { v: any }) {
  const a = one(v.analyses);
  const fmtDay = (s: string) => new Date(s).toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw" });
  const score = a ? Number(a.editor_score ?? a.ai_score) : null;
  const reasons = a
    ? [Number(a.ai_score) < threshold() ? "niska ocena" : null, a.clickbait_level === "Wysoki" ? "clickbait Wysoki" : null].filter(Boolean).join(", ")
    : "";
  return (
    <article className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
            score === null ? "bg-border/40 text-muted" : score < threshold() ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : "bg-accent/10 text-accent"
          }`}
          title={a?.editor_score != null ? `Redaktor: ${a.editor_score}, AI: ${a.ai_score}` : "Ocena AI"}
        >
          {score === null ? "–" : score.toFixed(1)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium leading-snug">{v.title}</h3>
          <p className="mt-0.5 text-xs text-muted">
            {v.channels?.name}
            {v.published_at && <> · film z <strong>{fmtDay(v.published_at)}</strong></>}
            {v.duration_seconds ? ` · ${Math.round(v.duration_seconds / 60)} min` : ""}
            {a && ` · clickbait: ${a.clickbait_level}`}
            {reasons && v.status !== "failed" && <span className="text-amber-600"> · {reasons}</span>}
            {" · "}
            <a className="underline" target="_blank" rel="noopener noreferrer" href={`https://www.youtube.com/watch?v=${v.youtube_video_id}`}>YouTube</a>
          </p>
          {v.error && <p className="mt-1 text-xs text-rose-600">Błąd: {v.error}</p>}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {v.status !== "published" && a && (
          <form action={setStatus}>
            <input type="hidden" name="id" value={v.id} />
            <input type="hidden" name="status" value="published" />
            <button className={btnPrimary}>Opublikuj</button>
          </form>
        )}
        {v.status === "pending" && (
          <form action={setStatus}>
            <input type="hidden" name="id" value={v.id} />
            <input type="hidden" name="status" value="skipped" />
            <button className={btn}>Odrzuć</button>
          </form>
        )}
        {v.status === "published" && (
          <form action={setStatus}>
            <input type="hidden" name="id" value={v.id} />
            <input type="hidden" name="status" value="pending" />
            <button className={btn}>Wycofaj</button>
          </form>
        )}
        {v.status === "failed" && (
          <form action={setStatus}>
            <input type="hidden" name="id" value={v.id} />
            <input type="hidden" name="status" value="queued" />
            <button className={btn}>Ponów</button>
          </form>
        )}
        {a && (
          <details className="w-full text-sm sm:w-auto sm:flex-1">
            <summary className="cursor-pointer py-2 text-muted">Wnioski, korekta oceny…</summary>
            <p className="mt-1 text-xs text-muted">
              AI: {a.ai_score}/10{a.guest ? ` · gość: ${a.guest}` : ""} · {(a.tags ?? []).join(" ")}
              {a.created_at &&
                ` · oceniono ${new Date(a.created_at).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw", dateStyle: "short", timeStyle: "short" })}`}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {(a.summary ?? []).map((s: string, i: number) => <li key={i}>{s}</li>)}
            </ul>
            <form action={saveEditor} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input type="hidden" name="id" value={v.id} />
              <input name="score" defaultValue={a.editor_score ?? ""} placeholder="Ocena redaktora" inputMode="decimal" className={`${input} w-full sm:w-36`} />
              <input name="comment" defaultValue={a.editor_comment ?? ""} placeholder="Komentarz redaktora" className={`${input} flex-1`} />
              <button className={btn}>Zapisz</button>
            </form>
            {(v.status === "pending" || v.status === "published") && (
              <form action={setStatus} className="mt-2">
                <input type="hidden" name="id" value={v.id} />
                <input type="hidden" name="status" value="queued" />
                <button className={btn} title="Wraca do kolejki i jest oceniany od nowa. Po ocenie trzeba go znów opublikować.">
                  Oceń ponownie
                </button>
              </form>
            )}
          </details>
        )}
      </div>
    </article>
  );
}

// ===================== Facebook =====================
async function FacebookTab() {
  const fbReady = facebookConfigured();
  const { data: posts } = await createAdminClient()
    .from("social_posts")
    .select("id, day, message, link, status, error, external_id")
    .order("day", { ascending: false })
    .limit(10);
  return (
    <section className="space-y-4">
      <p className="text-sm text-muted">
        {fbReady ? "Fanpage podłączony. " : "Fanpage niepodłączony (ustaw FACEBOOK_PAGE_ID i FACEBOOK_PAGE_TOKEN w Render). "}
        Codziennie po {process.env.FB_POST_HOUR ?? "8"}:00 powstaje szkic z TOP 5 wywiadów z poprzedniego dnia
        {process.env.FB_AUTO_PUBLISH === "true" ? " i publikuje się automatycznie." : "; publikujesz go tutaj."}
      </p>
      <form action={createPostNow}>
        <button className={btn}>Utwórz szkic za wczoraj teraz</button>
      </form>
      {(posts ?? []).map((p) => {
        const editable = p.status !== "published" && !(p.status === "skipped" && p.message.startsWith("("));
        const head = (
          <>
            <strong>{new Date(p.day + "T12:00:00Z").toLocaleDateString("pl-PL")}</strong> · {POST_STATUS[p.status] ?? p.status}
          </>
        );
        if (!editable) {
          return (
            <details key={p.id} className="rounded-xl border border-border bg-card p-3 text-sm">
              <summary className="cursor-pointer">{head}</summary>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-muted">{p.message}</pre>
            </details>
          );
        }
        return (
          // Klucz zależy od treści: po „Wygeneruj od nowa" pola pokazują nowy tekst, a nie stary z przeglądarki.
          <form key={`${p.id}:${p.status}:${p.message.length}:${p.message.slice(0, 40)}`} action={savePost} className="rounded-xl border border-border bg-card p-3">
            <input type="hidden" name="id" value={p.id} />
            <p className="mb-2 text-sm">{head}</p>
            {p.error && <p className="mb-2 text-xs text-rose-600">Błąd: {p.error}</p>}
            <textarea name="message" defaultValue={p.message} rows={12} className="w-full rounded-lg border border-border bg-background p-2 text-sm" />
            <input name="link" defaultValue={p.link ?? ""} placeholder="Link (podgląd filmu z YouTube)" className={`${input} mt-2 w-full`} />
            <div className="mt-2 flex flex-wrap gap-2">
              <button name="intent" value="publish" className={btnPrimary} disabled={!fbReady}>
                Opublikuj na Facebooku
              </button>
              <button name="intent" value="save" className={btn}>Zapisz zmiany</button>
              <button name="intent" value="regenerate" className={btn} formNoValidate>
                Wygeneruj od nowa
              </button>
              <button name="intent" value="skip" className={btn}>Pomiń</button>
            </div>
          </form>
        );
      })}
    </section>
  );
}

// ===================== Kanały i ankieta =====================
async function ChannelsTab() {
  const pollNow = pollMonth();
  const pollPrev = previousMonth(pollNow);
  const [{ data: channels }, pollCur, pollOld] = await Promise.all([
    createAdminClient().from("channels").select("id, name, handle, active, youtube_channel_id").order("created_at"),
    getPollForAdmin(pollNow),
    getPollForAdmin(pollPrev),
  ]);
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 font-semibold">Kanały ({(channels ?? []).filter((c) => c.active).length} aktywnych)</h2>
        <form action={addChannel} className="mb-4 flex flex-col gap-2 sm:flex-row">
          <input name="channel" placeholder="Link, @nazwa lub ID kanału (UC…)" className={`${input} flex-1`} required />
          <button className={btnPrimary}>Dodaj kanał</button>
        </form>
        <ul className="space-y-1 text-sm">
          {(channels ?? []).map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 border-b border-border/60 py-1">
              <span className="min-w-0 truncate">
                {c.name} <span className="text-muted">{c.handle ?? c.youtube_channel_id}</span>
                {!c.active && <span className="ml-2 text-amber-600">(wyłączony)</span>}
              </span>
              <form action={toggleChannel}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="active" value={String(!c.active)} />
                <button className={btn}>{c.active ? "Wyłącz" : "Włącz"}</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-1 font-semibold">Ankieta: propozycje nowych kanałów</h2>
        <p className="mb-3 text-sm text-muted">
          Użytkownicy proponują kanały na /kanaly (3 głosy na osobę w miesiącu). Dodanie kanału formularzem wyżej oznacza pasującą propozycję jako „Dodany".
        </p>
        {[
          { month: pollPrev, items: pollOld, title: `Zakończona: ${monthLabel(pollPrev)}` },
          { month: pollNow, items: pollCur, title: `Trwa: ${monthLabel(pollNow)}` },
        ].map((g) => (
          <div key={g.month} className="mb-4">
            <h3 className="mb-2 text-sm font-semibold">{g.title}</h3>
            {g.items.length === 0 ? (
              <p className="text-sm text-muted">Brak propozycji.</p>
            ) : (
              <ol className="space-y-2 text-sm">
                {g.items.slice(0, 15).map((it, i) => (
                  <li key={it.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                    <span className={it.status === "rejected" ? "text-muted line-through" : ""}>
                      {i + 1}. <strong>{it.name}</strong> — {it.votes} gł.
                      {it.url && (
                        <>
                          {" · "}
                          <a href={it.url} target="_blank" rel="noopener noreferrer" className="underline">link</a>
                        </>
                      )}
                      {it.status === "added" && " · ✓ dodany"}
                    </span>
                    <span className="flex gap-2">
                      {(["added", "rejected", "open"] as const)
                        .filter((s) => s !== it.status)
                        .map((s) => (
                          <form key={s} action={setSuggestionStatus}>
                            <input type="hidden" name="id" value={it.id} />
                            <input type="hidden" name="status" value={s} />
                            <button className={btn}>{s === "added" ? "Dodany" : s === "rejected" ? "Odrzuć" : "Przywróć"}</button>
                          </form>
                        ))}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

// ===================== Użytkownicy =====================
async function UsersTab() {
  const { data: users } = await createAdminClient()
    .from("profiles")
    .select("email, subscription_status, trial_ends_at, created_at, is_admin")
    .order("created_at", { ascending: false });
  const now = Date.now();
  const u = users ?? [];
  const stats = {
    total: u.length,
    trial: u.filter((x) => x.subscription_status === "trialing" && new Date(x.trial_ends_at).getTime() > now).length,
    active: u.filter((x) => x.subscription_status === "active" || x.is_admin).length,
    expired: u.filter((x) => !x.is_admin && x.subscription_status !== "active" && new Date(x.trial_ends_at).getTime() <= now).length,
    last7: u.filter((x) => now - new Date(x.created_at).getTime() < 7 * 86400e3).length,
    today: u.filter((x) => now - new Date(x.created_at).getTime() < 86400e3).length,
  };
  const maxUsers = process.env.MAX_USERS ? parseInt(process.env.MAX_USERS, 10) : null;
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
        {[
          ["Zarejestrowani", stats.total],
          ["W okresie próbnym", stats.trial],
          ["Subskrypcja/admin", stats.active],
          ["Po okresie próbnym", stats.expired],
        ].map(([label, n]) => (
          <div key={String(label)} className="rounded-xl bg-accent/10 p-3">
            <div className="text-2xl font-bold text-accent">{n}</div>
            <div className="text-xs text-muted">{label}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">
        Nowi: {stats.today} w ciągu 24 h, {stats.last7} w ciągu 7 dni.{" "}
        {maxUsers ? `Limit miejsc: ${maxUsers} (wolnych: ${Math.max(0, maxUsers - stats.total)}).` : "Limit miejsc: brak (ustaw MAX_USERS w Render → Environment)."}
      </p>
      {u.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {u.slice(0, 50).map((x, i) => (
            <li key={i} className="flex flex-wrap justify-between gap-2 border-b border-border/60 py-1">
              <span className="truncate">{x.email ?? "(brak e-maila)"}{x.is_admin ? " · admin" : ""}</span>
              <span className="text-xs text-muted">
                {new Date(x.created_at).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw", dateStyle: "short", timeStyle: "short" })}
                {" · trial do "}
                {new Date(x.trial_ends_at).toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw" })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

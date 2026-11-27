import { Suspense } from "react";
import type { Metadata } from "next";
import { isAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { facebookConfigured } from "@/lib/social/facebook";
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

export default function AdminPage(props: { searchParams: Promise<{ [k: string]: string | string[] | undefined }> }) {
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

async function Content({ searchParams }: { searchParams: Promise<{ [k: string]: string | string[] | undefined }> }) {
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

  const db = createAdminClient();
  const [{ data: channels }, { data: videos }, { data: all }, { data: users }, { data: posts }] = await Promise.all([
    db.from("channels").select("id, name, handle, active, youtube_channel_id").order("created_at"),
    db
      .from("videos")
      .select(
        "id, title, status, duration_seconds, published_at, error, youtube_video_id, channels(name), analyses(ai_score, editor_score, editor_comment, clickbait_level, guest, tags, summary, created_at)",
      )
      .in("status", ["pending", "published", "failed", "queued", "processing"])
      .order("published_at", { ascending: false })
      .limit(100),
    db.from("videos").select("status"),
    db
      .from("profiles")
      .select("email, subscription_status, trial_ends_at, created_at, is_admin")
      .order("created_at", { ascending: false }),
    db.from("social_posts").select("id, day, message, link, status, error, external_id").order("day", { ascending: false }).limit(5),
  ]);
  const fbReady = facebookConfigured();
  const pollNow = pollMonth();
  const pollPrev = previousMonth(pollNow);
  const [pollCur, pollOld] = await Promise.all([getPollForAdmin(pollNow), getPollForAdmin(pollPrev)]);

  // Statystyki użytkowników (wersja próbna): ile osób się zarejestrowało i w jakim są stanie.
  const now = Date.now();
  const u = users ?? [];
  const stats = {
    total: u.length,
    trial: u.filter((x) => x.subscription_status === "trialing" && new Date(x.trial_ends_at).getTime() > now).length,
    active: u.filter((x) => x.subscription_status === "active" || x.is_admin).length,
    expired: u.filter(
      (x) => !x.is_admin && x.subscription_status !== "active" && new Date(x.trial_ends_at).getTime() <= now,
    ).length,
    last7: u.filter((x) => now - new Date(x.created_at).getTime() < 7 * 86400e3).length,
    today: u.filter((x) => now - new Date(x.created_at).getTime() < 86400e3).length,
  };
  const maxUsers = process.env.MAX_USERS ? parseInt(process.env.MAX_USERS, 10) : null;

  const counts: Record<string, number> = {};
  for (const v of all ?? []) counts[v.status] = (counts[v.status] ?? 0) + 1;

  const groups: { key: string; label: string }[] = [
    { key: "pending", label: "Do Twojej akceptacji (niska ocena lub wysoki clickbait)" },
    { key: "published", label: "Opublikowane" },
    { key: "failed", label: "Błędy" },
    { key: "queued", label: "W kolejce" },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Panel admina</h1>
        <div className="flex gap-2">
          <a href="/" className={btn}>Strona główna</a>
          <form action={logout}><button className={btn}>Wyloguj</button></form>
        </div>
      </header>

      {sp.msg && <p className="rounded-lg bg-accent/10 p-3 text-sm">{String(sp.msg)}</p>}

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 font-semibold">Użytkownicy (wersja próbna)</h2>
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
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-muted">Ostatnio zarejestrowani ({Math.min(15, u.length)})</summary>
            <ul className="mt-2 space-y-1">
              {u.slice(0, 15).map((x, i) => (
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
          </details>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-2 font-semibold">Przetwarzanie</h2>
        <p className="mb-3 text-sm text-muted">
          {Object.entries(counts).map(([k, n]) => `${k}: ${n}`).join(" · ") || "brak filmów"}
        </p>
        <form action={runNow}>
          <button className={btnPrimary}>Sprawdź nowości teraz</button>
        </form>
        <p className="mt-2 text-xs text-muted">Trwa do kilku minut (pobiera transkrypcje i ocenia do 5 filmów).</p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-1 font-semibold">Ankieta: propozycje nowych kanałów</h2>
        <p className="mb-3 text-sm text-muted">
          Użytkownicy proponują kanały na /kanaly (3 głosy na osobę w miesiącu). Sprawdź zwycięzców, dodaj kanał formularzem niżej
          (link lub @nazwa), a potem oznacz propozycję jako „Dodany".
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

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-1 font-semibold">Facebook — ranking dnia</h2>
        <p className="mb-3 text-sm text-muted">
          {fbReady
            ? "Fanpage podłączony. "
            : "Fanpage niepodłączony (ustaw FACEBOOK_PAGE_ID i FACEBOOK_PAGE_TOKEN w Render). "}
          Codziennie po {process.env.FB_POST_HOUR ?? "8"}:00 powstaje szkic z TOP 5 wywiadów z poprzedniego dnia
          {process.env.FB_AUTO_PUBLISH === "true" ? " i publikuje się automatycznie." : "; publikujesz go tutaj."}
        </p>
        <div className="space-y-4">
          {(posts ?? []).map((p) => (
            // Klucz zależy od treści: po „Wygeneruj od nowa" pola pokazują nowy tekst, a nie stary z przeglądarki.
            <form key={`${p.id}:${p.status}:${p.message.length}:${p.message.slice(0, 40)}`} action={savePost} className="rounded-xl border border-border p-3">
              <input type="hidden" name="id" value={p.id} />
              <p className="mb-2 text-sm">
                <strong>{new Date(p.day + "T12:00:00Z").toLocaleDateString("pl-PL")}</strong> · {POST_STATUS[p.status] ?? p.status}
              </p>
              {p.error && <p className="mb-2 text-xs text-rose-600">Błąd: {p.error}</p>}
              {p.status === "skipped" && p.message.startsWith("(") ? null : (
                <>
                  <textarea
                    name="message"
                    defaultValue={p.message}
                    rows={12}
                    readOnly={p.status === "published"}
                    className="w-full rounded-lg border border-border bg-background p-2 text-sm"
                  />
                  <input
                    name="link"
                    defaultValue={p.link ?? ""}
                    placeholder="Link (podgląd filmu z YouTube)"
                    readOnly={p.status === "published"}
                    className={`${input} mt-2 w-full`}
                  />
                  {p.status !== "published" && (
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
                  )}
                </>
              )}
            </form>
          ))}
        </div>
        <form action={createPostNow} className="mt-3">
          <button className={btn}>Utwórz szkic za wczoraj teraz</button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 font-semibold">Kanały</h2>
        <ul className="mb-4 space-y-2 text-sm">
          {(channels ?? []).map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2">
              <span>
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
        <form action={addChannel} className="flex flex-col gap-2 sm:flex-row">
          <input name="channel" placeholder="Link, @nazwa lub ID kanału (UC…)" className={`${input} flex-1`} required />
          <button className={btnPrimary}>Dodaj kanał</button>
        </form>
      </section>

      {groups.map((g) => {
        const list = (videos ?? []).filter((v) => v.status === g.key);
        if (list.length === 0) return null;
        return (
          <section key={g.key} className="space-y-3">
            <h2 className="font-semibold">{g.label} ({list.length})</h2>
            {list.map((v: any) => {
              const a = Array.isArray(v.analyses) ? v.analyses[0] : v.analyses;
              return (
                <article key={v.id} className="rounded-2xl border border-border bg-card p-4">
                  <h3 className="font-medium leading-snug">{v.title}</h3>
                  <p className="mt-1 text-xs text-muted">
                    {v.channels?.name} · {v.duration_seconds ? Math.round(v.duration_seconds / 60) + " min" : ""} ·{" "}
                    {v.published_at && (
                      <>
                        film z <strong>{new Date(v.published_at).toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw" })}</strong> ·{" "}
                      </>
                    )}
                    {a?.created_at && (
                      <>
                        oceniono{" "}
                        {new Date(a.created_at).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw", dateStyle: "short", timeStyle: "short" })} ·{" "}
                      </>
                    )}
                    <a className="underline" target="_blank" rel="noopener noreferrer" href={`https://www.youtube.com/watch?v=${v.youtube_video_id}`}>YouTube</a>
                  </p>
                  {v.error && <p className="mt-1 text-xs text-rose-600">Błąd: {v.error}</p>}
                  {a && v.status === "pending" && (
                    <p className="mt-2 text-xs text-amber-600">
                      Wstrzymany do akceptacji:{" "}
                      {[
                        Number(a.ai_score) < Number(process.env.REVIEW_BELOW_SCORE ?? "4") ? "niska ocena AI" : null,
                        a.clickbait_level === "Wysoki" ? "clickbait: Wysoki" : null,
                      ]
                        .filter(Boolean)
                        .join(", ") || "ręczna decyzja"}
                      .
                    </p>
                  )}
                  {a && (
                    <>
                      <p className="mt-2 text-sm">
                        AI: <strong>{a.ai_score}</strong>/10 · clickbait: {a.clickbait_level}
                        {a.guest ? ` · gość: ${a.guest}` : ""} · {(a.tags ?? []).join(" ")}
                      </p>
                      <details className="mt-2 text-sm">
                        <summary className="cursor-pointer text-muted">Wnioski</summary>
                        <ul className="mt-1 list-disc space-y-1 pl-5">
                          {(a.summary ?? []).map((s: string, i: number) => <li key={i}>{s}</li>)}
                        </ul>
                      </details>
                      <form action={saveEditor} className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <input type="hidden" name="id" value={v.id} />
                        <input name="score" defaultValue={a.editor_score ?? ""} placeholder="Ocena redaktora" inputMode="decimal" className={`${input} w-full sm:w-36`} />
                        <input name="comment" defaultValue={a.editor_comment ?? ""} placeholder="Komentarz redaktora" className={`${input} flex-1`} />
                        <button className={btn}>Zapisz</button>
                      </form>
                    </>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {v.status !== "published" && a && (
                      <form action={setStatus}>
                        <input type="hidden" name="id" value={v.id} />
                        <input type="hidden" name="status" value="published" />
                        <button className={btnPrimary}>Opublikuj</button>
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
                    {(v.status === "pending" || v.status === "published") && (
                      <form action={setStatus}>
                        <input type="hidden" name="id" value={v.id} />
                        <input type="hidden" name="status" value="queued" />
                        <button className={btn} title="Wraca do kolejki i jest oceniany od nowa (nowym promptem). Po ocenie trzeba go znów opublikować.">
                          Oceń ponownie
                        </button>
                      </form>
                    )}
                    {v.status === "pending" && (
                      <form action={setStatus}>
                        <input type="hidden" name="id" value={v.id} />
                        <input type="hidden" name="status" value="skipped" />
                        <button className={btn}>Odrzuć</button>
                      </form>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

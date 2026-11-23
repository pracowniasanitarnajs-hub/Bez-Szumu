import { Suspense } from "react";
import type { Metadata } from "next";
import { isAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { addChannel, login, logout, runNow, saveEditor, setStatus, toggleChannel } from "./actions";

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
  const [{ data: channels }, { data: videos }, { data: all }] = await Promise.all([
    db.from("channels").select("id, name, handle, active, youtube_channel_id").order("created_at"),
    db
      .from("videos")
      .select(
        "id, title, status, duration_seconds, published_at, error, youtube_video_id, channels(name), analyses(ai_score, editor_score, editor_comment, clickbait_level, guest, tags, summary)",
      )
      .in("status", ["pending", "published", "failed", "queued", "processing"])
      .order("published_at", { ascending: false })
      .limit(100),
    db.from("videos").select("status"),
  ]);

  const counts: Record<string, number> = {};
  for (const v of all ?? []) counts[v.status] = (counts[v.status] ?? 0) + 1;

  const groups: { key: string; label: string }[] = [
    { key: "pending", label: "Oczekujące na publikację" },
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
                    <a className="underline" target="_blank" rel="noopener noreferrer" href={`https://www.youtube.com/watch?v=${v.youtube_video_id}`}>YouTube</a>
                  </p>
                  {v.error && <p className="mt-1 text-xs text-rose-600">Błąd: {v.error}</p>}
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

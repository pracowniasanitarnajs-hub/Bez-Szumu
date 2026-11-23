import { getRanking, type RankedVideo } from "@/lib/ranking";

const CLICKBAIT_STYLE: Record<RankedVideo["clickbait"], string> = {
  Niski: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Średni: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Wysoki: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

function fmt(t: number) {
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `${h > 0 ? h + ":" : ""}${String(m).padStart(h > 0 ? 2 : 1, "0")}:${String(s).padStart(2, "0")}`;
}

function Card({ v }: { v: RankedVideo }) {
  const yt = `https://www.youtube.com/watch?v=${v.youtubeVideoId}`;
  return (
    <article className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div
          className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-accent/10 text-accent"
          aria-label={`Ocena ${v.score} na 10`}
        >
          <span className="text-2xl font-bold leading-none">{v.score.toFixed(1)}</span>
          <span className="text-[10px] uppercase tracking-wide opacity-70">/ 10</span>
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-snug sm:text-lg">{v.title}</h2>
          <p className="mt-1 text-sm text-muted">
            {v.channel}
            {v.guest ? ` · ${v.guest}` : ""}
            {v.durationSeconds ? ` · ${Math.round(v.durationSeconds / 60)} min` : ""}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2.5 py-1 font-medium ${CLICKBAIT_STYLE[v.clickbait]}`}>
          Zgodność tytułu: {v.clickbait === "Niski" ? "wysoka" : v.clickbait === "Średni" ? "częściowa" : "niska"} (clickbait: {v.clickbait.toLowerCase()})
        </span>
        {v.tags.map((t) => (
          <span key={t} className="rounded-full border border-border px-2.5 py-1 text-muted">{t}</span>
        ))}
      </div>
      {v.clickbaitNote && <p className="mt-2 text-xs text-muted">{v.clickbaitNote}</p>}

      <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm">
        {v.summary.map((s, i) => <li key={i}>{s}</li>)}
      </ul>

      {v.timestamps.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {v.timestamps.map((t) => (
            <li key={t.t}>
              <a
                href={`${yt}&t=${t.t}s`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs hover:border-accent"
              >
                <span className="font-mono text-accent">{fmt(t.t)}</span>
                <span>{t.label}</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {v.editorComment && (
        <p className="mt-4 rounded-lg bg-accent/10 p-3 text-sm">
          <strong>Komentarz redaktora:</strong> {v.editorComment}
        </p>
      )}

      <a
        href={yt}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white dark:text-slate-900 sm:w-auto"
      >
        Obejrzyj na YouTube →
      </a>
    </article>
  );
}

export default async function Home() {
  const { items, demo } = await getRanking();
  const sorted = [...items].sort((a, b) => b.score - a.score);

  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <span className="text-lg font-bold tracking-tight">Bez Szumu</span>
          <span className="rounded-full bg-accent/10 px-3 py-1 text-xs text-accent">wersja robocza</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <section className="mb-6">
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
            Najlepsze polskie wywiady geopolityczne. Bez clickbaitów.
          </h1>
          <p className="mt-2 text-muted">
            Codziennie oceniamy nowe rozmowy powyżej 20 minut: merytoryka, zgodność tytułu z treścią, wnioski i znaczniki czasu.
          </p>
          <div className="mt-4 rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm">
            Zaloguj się przez Google lub Apple i testuj pełny dostęp za darmo przez 30 dni (bez podawania karty).
          </div>
          {demo && (
            <p className="mt-3 text-xs text-muted">Tryb demonstracyjny: dane przykładowe, baza nie jest jeszcze podłączona.</p>
          )}
        </section>

        <div className="space-y-4">
          {sorted.length === 0 ? (
            <p className="text-muted">Brak opublikowanych wywiadów.</p>
          ) : (
            sorted.map((v) => <Card key={v.id} v={v} />)
          )}
        </div>

        <p className="mt-8 text-xs text-muted">
          Oceny są generowane automatycznie przez AI i mogą być korygowane przez redaktora. Serwis tylko linkuje do materiałów na YouTube.
        </p>
      </main>
    </>
  );
}

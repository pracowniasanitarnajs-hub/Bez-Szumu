import { Suspense } from "react";
import type { Metadata } from "next";
import { getChannels, type ChannelInfo } from "@/lib/channels";
import { getPoll } from "@/lib/channel-poll";
import { createSupabaseServer } from "@/lib/supabase/server";
import { ChannelPoll } from "./channel-poll";
import { getAccess } from "@/lib/session";
import { SiteHeader } from "../site-header";
import { SiteFooter } from "../site-footer";
import { LoginWall } from "../login-wall";

export const metadata: Metadata = {
  title: "Kanały — Bez Szumu",
  description: "Lista polskich kanałów YouTube, których wywiady oceniamy: liczba rozmów i średnia ocena merytoryczna.",
};

export default function ChannelsPage() {
  return (
    <>
      <SiteHeader active="kanaly" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <section className="mb-6">
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl">Kanały, które oceniamy</h1>
          <p className="mt-2 text-muted">
            Na bieżąco sprawdzamy nowe filmy z tych polskich kanałów YouTube. Średnia ocena to średnia ocen merytorycznych opublikowanych rozmów.
          </p>
          <a href="#ankieta" className="mt-2 inline-block text-sm font-semibold text-accent underline">
            Brakuje kanału? Zaproponuj go w ankiecie ↓
          </a>
        </section>

        <Suspense fallback={<p className="py-10 text-center text-muted">Ładowanie…</p>}>
          <ChannelList />
        </Suspense>

        <SiteFooter />
      </main>
    </>
  );
}

async function ChannelList() {
  const access = await getAccess();
  if (access.level === "guest" && process.env.REQUIRE_LOGIN !== "false") {
    return <LoginWall title="Zaloguj się, aby zobaczyć listę kanałów" />;
  }

  const { data: claims } = await (await createSupabaseServer()).auth.getClaims();
  const userId = (claims?.claims?.sub as string | undefined) ?? null;
  const [channels, poll] = await Promise.all([getChannels(), getPoll(userId)]);

  return (
    <>
      {channels.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-center text-muted">Brak kanałów.</p>
      ) : (
        <ChannelCards channels={channels} />
      )}
      <ChannelPoll poll={poll} canVote={!!userId} />
    </>
  );
}

function ChannelCards({ channels }: { channels: ChannelInfo[] }) {
  return (
    <ul className="space-y-3">
      {channels.map((c) => (
        <li key={c.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold leading-snug">{c.name}</h2>
              {c.handle && <p className="text-sm text-muted">{c.handle}</p>}
            </div>
            <div
              className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-accent/10 text-accent"
              aria-label={c.avgScore === null ? "Brak ocen" : `Średnia ocena ${c.avgScore} na 10`}
            >
              <span className="text-xl font-bold leading-none">{c.avgScore === null ? "–" : c.avgScore.toFixed(1)}</span>
              <span className="text-[10px] uppercase tracking-wide opacity-70">średnia</span>
            </div>
          </div>

          <p className="mt-3 text-sm text-muted">
            {c.videoCount} {c.videoCount === 1 ? "oceniony wywiad" : "ocenionych wywiadów"}
            {c.bestScore !== null ? ` · najlepszy ${c.bestScore.toFixed(1)}/10` : ""}
            {c.lastPublishedAt
              ? ` · ostatni ${new Date(c.lastPublishedAt).toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw" })}`
              : ""}
          </p>

          <a
            href={c.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold hover:border-accent sm:w-auto"
          >
            Otwórz kanał na YouTube →
          </a>
        </li>
      ))}
    </ul>
  );
}

"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import type { Poll } from "@/lib/channel-poll";
import { monthLabel, VOTES_PER_MONTH } from "@/lib/channel-poll";
import { suggestChannel, toggleVote } from "./poll-actions";

function glosy(n: number) {
  if (n === 1) return "głos";
  const l = n % 10;
  const t = n % 100;
  return l >= 2 && l <= 4 && !(t >= 12 && t <= 14) ? "głosy" : "głosów";
}

export function ChannelPoll({ poll, canVote }: { poll: Poll; canVote: boolean }) {
  const [state, formAction, adding] = useActionState(suggestChannel, null);
  const [pending, start] = useTransition();
  const [voteErr, setVoteErr] = useState<string | null>(null);
  const left = VOTES_PER_MONTH - poll.myVotes;

  function vote(id: string) {
    setVoteErr(null);
    start(async () => {
      const r = await toggleVote(id);
      if (!r.ok) setVoteErr(r.message ?? "Błąd zapisu.");
    });
  }

  return (
    <section className="mt-10" aria-labelledby="ankieta">
      <h2 id="ankieta" className="text-xl font-bold leading-tight sm:text-2xl">
        Jakiego kanału brakuje? Ankieta — {monthLabel(poll.month)}
      </h2>
      <p className="mt-2 text-sm text-muted">
        Zaproponuj polski kanał YouTube z merytorycznymi wywiadami albo zagłosuj na propozycje innych. Każdy ma {VOTES_PER_MONTH} głosy w miesiącu.
        Po zakończeniu miesiąca sprawdzamy najpopularniejsze propozycje i dodajemy te, które pasują do serwisu.
      </p>

      {!canVote ? (
        <p className="mt-4 rounded-xl border border-border bg-card p-4 text-sm text-muted">
          <Link href="/login" className="font-semibold text-accent underline">Zaloguj się</Link>, aby zaproponować kanał i głosować.
        </p>
      ) : !poll.ready ? (
        <p className="mt-4 rounded-xl border border-border bg-card p-4 text-sm text-muted">Ankieta wkrótce ruszy.</p>
      ) : (
        <form action={formAction} className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <label className="block text-sm font-semibold" htmlFor="poll-name">Nazwa kanału</label>
          <input
            id="poll-name"
            name="name"
            required
            minLength={2}
            maxLength={80}
            placeholder="np. nazwa kanału lub @nazwa"
            className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-base"
          />
          <label className="mt-3 block text-sm font-semibold" htmlFor="poll-url">
            Link do kanału <span className="font-normal text-muted">(opcjonalnie)</span>
          </label>
          <input
            id="poll-url"
            name="url"
            type="url"
            maxLength={300}
            placeholder="https://www.youtube.com/@..."
            className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-base"
          />
          <button
            type="submit"
            disabled={adding}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-white disabled:opacity-60 dark:text-slate-900 sm:w-auto"
          >
            {adding ? "Zapisywanie…" : "Zaproponuj kanał"}
          </button>
          {state?.message && <p className={`mt-3 text-sm ${state.ok ? "text-emerald-600" : "text-rose-600"}`}>{state.message}</p>}
        </form>
      )}

      {poll.ready && (
        <>
          <div className="mt-6 flex items-baseline justify-between gap-3">
            <h3 className="font-semibold">Propozycje w tym miesiącu</h3>
            {canVote && <span className="text-sm text-muted">Pozostałe głosy: {left}/{VOTES_PER_MONTH}</span>}
          </div>
          {voteErr && <p className="mt-2 text-sm text-rose-600">{voteErr}</p>}
          {poll.items.length === 0 ? (
            <p className="mt-3 rounded-xl border border-border bg-card p-4 text-sm text-muted">Na razie brak propozycji. Zaproponuj pierwszy kanał!</p>
          ) : (
            <ol className="mt-3 space-y-2">
              {poll.items.map((it, i) => (
                <li key={it.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <span className="w-6 shrink-0 text-center text-sm font-semibold text-muted">{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{it.name}</p>
                    <p className="text-xs text-muted">
                      {it.votes} {glosy(it.votes)}
                      {it.status === "added" && " · ✓ dodany do serwisu"}
                      {it.url && (
                        <>
                          {" · "}
                          <a href={it.url} target="_blank" rel="noopener noreferrer nofollow" className="underline">
                            YouTube
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                  {canVote && it.status === "open" && (
                    <button
                      type="button"
                      disabled={pending || (!it.mine && left <= 0)}
                      onClick={() => vote(it.id)}
                      aria-pressed={it.mine}
                      className={`min-h-10 shrink-0 rounded-lg border px-3 text-sm font-semibold transition-colors disabled:opacity-50 ${
                        it.mine ? "border-accent bg-accent text-white dark:text-slate-900" : "border-border hover:border-accent"
                      }`}
                    >
                      {it.mine ? "✓ Twój głos" : "Głosuj"}
                    </button>
                  )}
                </li>
              ))}
            </ol>
          )}

          {poll.previous.items.length > 0 && (
            <div className="mt-6 rounded-xl border border-border p-4">
              <h3 className="font-semibold">Wyniki — {monthLabel(poll.previous.month)}</h3>
              <ol className="mt-2 space-y-1 text-sm">
                {poll.previous.items.map((it, i) => (
                  <li key={it.id}>
                    {i + 1}. {it.name} — {it.votes} {glosy(it.votes)}
                    {it.status === "added" ? " · ✓ dodany" : " · w trakcie sprawdzania"}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </section>
  );
}

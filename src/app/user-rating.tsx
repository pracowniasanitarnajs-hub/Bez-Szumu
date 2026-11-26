"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { rateVideo } from "./rating-actions";

export type Stats = { avg: number; count: number };

function ocen(n: number) {
  if (n === 1) return "ocena";
  const l = n % 10;
  const t = n % 100;
  return l >= 2 && l <= 4 && !(t >= 12 && t <= 14) ? "oceny" : "ocen";
}

// Kafelek „Widzowie": średnia ocen użytkowników; kliknięcie otwiera panel oceniania.
export function UserRatingBox({ stats, open, onToggle }: { stats?: Stats; open: boolean; onToggle: () => void }) {
  const avg = stats?.avg;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={avg ? `Ocena widzów ${avg} na 10. Kliknij, aby ocenić` : "Brak ocen widzów. Kliknij, aby ocenić"}
      className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border transition-colors ${
        open ? "border-accent bg-accent/10" : "border-border bg-card hover:border-accent"
      }`}
    >
      <span className="text-2xl font-bold leading-none">{avg ? avg.toFixed(1) : "–"}</span>
      <span className="mt-0.5 text-[10px] uppercase tracking-wide text-muted">{stats?.count ? `${stats.count} ${ocen(stats.count)}` : "Oceń"}</span>
    </button>
  );
}

export function UserRatingPanel({
  videoId,
  canRate,
  stats,
  mine,
  onChange,
}: {
  videoId: string;
  canRate: boolean;
  stats?: Stats;
  mine?: number;
  onChange: (stats: Stats | undefined, mine: number | undefined) => void;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (!canRate) {
    return (
      <p className="mt-3 rounded-lg border border-border p-3 text-sm text-muted">
        <Link href="/login" className="font-semibold text-accent underline">Zaloguj się</Link>, aby ocenić ten wywiad.
      </p>
    );
  }

  function apply(score: number | null) {
    const prevStats = stats;
    const prevMine = mine;
    // Aktualizacja od razu na ekranie; przy błędzie cofamy.
    const sum = (stats ? stats.avg * stats.count : 0) - (mine ?? 0) + (score ?? 0);
    const count = (stats?.count ?? 0) - (mine ? 1 : 0) + (score ? 1 : 0);
    const next = count > 0 ? { avg: Math.round((sum / count) * 10) / 10, count } : undefined;
    onChange(next, score ?? undefined);
    setErr(null);
    start(async () => {
      const r = await rateVideo(videoId, score);
      if (!r.ok) {
        onChange(prevStats, prevMine);
        setErr(r.error ?? "Błąd zapisu.");
      }
    });
  }

  return (
    <div className="mt-3 rounded-lg border border-border bg-background/40 p-3">
      <p className="text-sm">
        {mine ? (
          <>
            Twoja ocena: <strong>{mine}/10</strong>. Kliknij inną liczbę, aby zmienić.
          </>
        ) : (
          "Jak oceniasz ten wywiad? (1 = słaby, 10 = świetny)"
        )}
      </p>
      <div className="mt-2 grid grid-cols-10 gap-1" role="group" aria-label="Twoja ocena od 1 do 10">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            disabled={pending}
            onClick={() => apply(n)}
            aria-pressed={mine === n}
            className={`min-h-10 rounded-md border text-sm font-semibold transition-colors disabled:opacity-60 ${
              mine === n ? "border-accent bg-accent text-white dark:text-slate-900" : "border-border bg-card hover:border-accent"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        <span>{stats ? `Średnia widzów: ${stats.avg.toFixed(1)} (${stats.count} ${ocen(stats.count)})` : "Nikt jeszcze nie ocenił."}</span>
        {mine && (
          <button type="button" disabled={pending} onClick={() => apply(null)} className="underline">
            Usuń moją ocenę
          </button>
        )}
      </div>
      {err && <p className="mt-2 text-xs text-rose-600">{err}</p>}
    </div>
  );
}

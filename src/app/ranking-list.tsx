"use client";

import { useEffect, useMemo, useState } from "react";
import type { RankedVideo } from "@/lib/ranking";
import { Card } from "./card";

type Range = "today" | "yesterday" | "week" | "month" | "all";
type Sort = "score" | "date";

const RANGES: { key: Range; label: string }[] = [
  { key: "today", label: "Dzisiejsze" },
  { key: "yesterday", label: "Wczorajsze" },
  { key: "week", label: "Z tygodnia" },
  { key: "month", label: "Z miesiąca" },
  { key: "all", label: "Wszystkie" },
];

const DAY = 24 * 3600e3;
const PAGE = 12;

// Dzień kalendarzowy w Polsce (RRRR-MM-DD), niezależnie od strefy czasowej przeglądarki.
function dayKey(ms: number): string {
  return new Date(ms).toLocaleDateString("sv-SE", { timeZone: "Europe/Warsaw" });
}

function inRange(range: Range, publishedAt: string, now: number | null): boolean {
  // `now` jest znany dopiero w przeglądarce; do tego czasu nie filtrujemy po dacie.
  if (now === null || range === "all") return true;
  const t = new Date(publishedAt).getTime();
  switch (range) {
    case "today":
      return dayKey(t) === dayKey(now);
    case "yesterday":
      return dayKey(t) === dayKey(now - DAY);
    case "week":
      return now - t <= 7 * DAY;
    case "month":
      return now - t <= 30 * DAY;
  }
}

// Wyszukiwanie bez rozróżniania wielkości liter i polskich znaków.
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function plural(n: number): string {
  if (n === 1) return "wywiad";
  const last = n % 10;
  const lastTwo = n % 100;
  return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? "wywiady" : "wywiadów";
}

const chip = (active: boolean) =>
  `min-h-10 rounded-full border px-3.5 text-sm font-medium transition-colors ${
    active ? "border-accent bg-accent text-white dark:text-slate-900" : "border-border bg-card hover:border-accent"
  }`;

export function RankingList({
  items,
  ratings = {},
  myRatings = {},
  canRate = false,
}: {
  items: RankedVideo[];
  ratings?: Record<string, { avg: number; count: number }>;
  myRatings?: Record<string, number>;
  canRate?: boolean;
}) {
  const [range, setRange] = useState<Range>("all");
  const [sort, setSort] = useState<Sort>("score");
  const [tag, setTag] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of items) for (const t of v.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
  }, [items]);

  // Liczba wywiadów w każdej zakładce (przed filtrami tagów i wyszukiwarki).
  const rangeCounts = useMemo(() => {
    const out = {} as Record<Range, number>;
    for (const r of RANGES) {
      out[r.key] = items.filter((v) => inRange(r.key, v.publishedAt, now)).length;
    }
    return out;
  }, [items, now]);

  const shown = useMemo(() => {
    const q = norm(query.trim());
    const list = items.filter((v) => {
      if (!inRange(range, v.publishedAt, now)) return false;
      if (tag && !v.tags.includes(tag)) return false;
      if (q) {
        const hay = norm([v.title, v.guest ?? "", v.channel, v.tags.join(" "), v.summary.join(" ")].join(" "));
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return list.sort((a, b) =>
      sort === "score"
        ? b.score - a.score
        : new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
  }, [items, range, sort, tag, query, now]);

  const filtered = range !== "all" || tag !== null || query.trim() !== "";

  // Karty pokazujemy partiami: na telefonie kilkadziesiąt kart naraz zużywa za dużo pamięci.
  const [limit, setLimit] = useState(PAGE);
  useEffect(() => setLimit(PAGE), [range, sort, tag, query]);
  const visible = shown.slice(0, limit);

  return (
    <div>
      <div className="mb-5 space-y-3">
        <div role="tablist" aria-label="Zakres czasu" className="-mx-4 flex overflow-x-auto border-b border-border px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {RANGES.map((r) => {
            const active = range === r.key;
            return (
              <button
                key={r.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setNow(Date.now());
                  setRange(r.key);
                }}
                className={`-mb-px min-h-12 shrink-0 whitespace-nowrap border-b-2 px-3 text-sm font-semibold transition-colors sm:text-base ${
                  active ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {r.label}
                <span className="ml-1 text-xs font-normal opacity-70">{rangeCounts[r.key]}</span>
              </button>
            );
          })}
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj: nazwisko eksperta lub temat…"
          aria-label="Szukaj wywiadów"
          className="min-h-12 w-full rounded-xl border border-border bg-card px-4 text-base outline-none focus:border-accent"
        />

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Tagi">
            {tags.map(([t, n]) => (
              <button key={t} type="button" className={chip(tag === t)} onClick={() => setTag(tag === t ? null : t)}>
                {t} <span className="opacity-60">{n}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted">
            {shown.length} {plural(shown.length)}
          </span>
          <div className="flex items-center gap-2">
            {filtered && (
              <button
                type="button"
                className="min-h-10 px-2 text-accent underline"
                onClick={() => {
                  setRange("all");
                  setTag(null);
                  setQuery("");
                }}
              >
                Wyczyść filtry
              </button>
            )}
            <label className="flex items-center gap-2 text-muted">
              Sortuj:
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="min-h-10 rounded-lg border border-border bg-card px-2 text-foreground"
              >
                <option value="score">wg oceny</option>
                <option value="date">wg daty</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {shown.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-muted">
            Brak wywiadów dla wybranych filtrów.
          </p>
        ) : (
          visible.map((v) => (
            <Card
              key={v.id}
              v={v}
              onTag={(t) => setTag(t)}
              rating={ratings[v.id]}
              myRating={myRatings[v.id]}
              canRate={canRate}
            />
          ))
        )}
        {shown.length > visible.length && (
          <button
            type="button"
            onClick={() => setLimit((l) => l + PAGE)}
            className="min-h-12 w-full rounded-xl border border-border bg-card text-sm font-semibold hover:border-accent"
          >
            Pokaż więcej ({shown.length - visible.length})
          </button>
        )}
      </div>
    </div>
  );
}

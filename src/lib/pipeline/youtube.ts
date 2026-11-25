export type VideoMeta = {
  durationSeconds: number;
  isLiveOrUpcoming: boolean;
  title: string | null; // aktualny tytuł (przy premierach zmienia się po jej zakończeniu)
};

// ISO 8601 (PT1H2M3S) -> sekundy.
export function parseIsoDuration(iso: string): number {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return 0;
  const [, d, h, min, s] = m.map((v) => (v ? parseInt(v, 10) : 0));
  return d * 86400 + h * 3600 + min * 60 + s;
}

// YouTube Data API: do 50 ID na jedno zapytanie.
export async function fetchVideoMeta(ids: string[]): Promise<Map<string, VideoMeta>> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("Brak YOUTUBE_API_KEY");
  const out = new Map<string, VideoMeta>();
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const url =
      "https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet" +
      `&id=${chunk.join(",")}&key=${key}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`YouTube API: HTTP ${res.status}`);
    const json = await res.json();
    for (const item of json.items ?? []) {
      const live = item.snippet?.liveBroadcastContent;
      out.set(item.id, {
        durationSeconds: parseIsoDuration(item.contentDetails?.duration ?? ""),
        isLiveOrUpcoming: live === "live" || live === "upcoming",
        title: item.snippet?.title ?? null,
      });
    }
  }
  return out;
}

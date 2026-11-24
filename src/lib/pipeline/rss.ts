import { XMLParser } from "fast-xml-parser";

export type RssVideo = {
  youtubeVideoId: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string | null;
};

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

// Ostatnie filmy kanału przez YouTube Data API (lista "uploads": UC... -> UU...).
// RSS oddaje tylko 15 pozycji, a na kanałach z wieloma Shortsami to za mało, żeby trafić na dłuższe rozmowy.
export async function fetchRecentUploads(youtubeChannelId: string, maxResults = 30): Promise<RssVideo[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("Brak YOUTUBE_API_KEY");
  if (!/^UC[\w-]{22}$/.test(youtubeChannelId)) throw new Error(`Nieprawidłowe ID kanału: ${youtubeChannelId}`);
  const playlistId = "UU" + youtubeChannelId.slice(2);
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=${maxResults}&key=${key}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error(`YouTube playlistItems ${youtubeChannelId}: HTTP ${res.status}`);
  const json = await res.json();
  return (json.items ?? []).flatMap((it: any) => {
    const id = it.contentDetails?.videoId ?? it.snippet?.resourceId?.videoId;
    if (!id) return [];
    return [
      {
        youtubeVideoId: String(id),
        title: String(it.snippet?.title ?? ""),
        publishedAt: String(it.contentDetails?.videoPublishedAt ?? it.snippet?.publishedAt),
        thumbnailUrl: it.snippet?.thumbnails?.high?.url ?? null,
      },
    ];
  });
}

export async function fetchChannelFeed(youtubeChannelId: string): Promise<RssVideo[]> {
  const res = await fetch(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(youtubeChannelId)}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error(`RSS ${youtubeChannelId}: HTTP ${res.status}`);
  const xml = parser.parse(await res.text());
  const raw = xml?.feed?.entry ?? [];
  const entries = Array.isArray(raw) ? raw : [raw];
  return entries.map((e: any) => ({
    youtubeVideoId: String(e["yt:videoId"]),
    title: String(e.title),
    publishedAt: String(e.published),
    thumbnailUrl: e["media:group"]?.["media:thumbnail"]?.["@_url"] ?? null,
  }));
}

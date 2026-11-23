import { XMLParser } from "fast-xml-parser";

export type RssVideo = {
  youtubeVideoId: string;
  title: string;
  publishedAt: string;
  thumbnailUrl: string | null;
};

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

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

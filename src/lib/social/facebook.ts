// Publikacja posta na fanpage'u przez Meta Graph API (token strony w FACEBOOK_PAGE_TOKEN).
export function facebookConfigured(): boolean {
  return !!process.env.FACEBOOK_PAGE_ID?.trim() && !!process.env.FACEBOOK_PAGE_TOKEN?.trim();
}

export async function publishToFacebook(message: string, link: string | null): Promise<string> {
  const page = process.env.FACEBOOK_PAGE_ID?.trim();
  const token = process.env.FACEBOOK_PAGE_TOKEN?.trim();
  if (!page || !token) throw new Error("Brak FACEBOOK_PAGE_ID lub FACEBOOK_PAGE_TOKEN");
  // Bez numeru wersji Graph API używa wersji domyślnej aplikacji; można wymusić np. FACEBOOK_GRAPH_VERSION=v23.0.
  const ver = process.env.FACEBOOK_GRAPH_VERSION?.trim();
  const url = `https://graph.facebook.com/${ver ? ver + "/" : ""}${encodeURIComponent(page)}/feed`;
  const body = new URLSearchParams({ message, access_token: token });
  if (link) body.set("link", link);
  const res = await fetch(url, { method: "POST", body, cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.id) throw new Error(`Facebook ${res.status}: ${json?.error?.message ?? "błąd"}`);
  return json.id as string;
}

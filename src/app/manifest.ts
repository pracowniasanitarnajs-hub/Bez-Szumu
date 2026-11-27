import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bez Szumu — ranking wywiadów geopolitycznych",
    short_name: "Bez Szumu",
    description: "Najlepsze polskie wywiady geopolityczne i historyczne. Oceny, wnioski, spis treści. Bez clickbaitów.",
    start_url: "/",
    display: "standalone",
    lang: "pl",
    background_color: "#ffffff",
    theme_color: "#0b1220",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

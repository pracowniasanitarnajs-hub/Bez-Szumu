import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bez Szumu — ranking wywiadów geopolitycznych",
    short_name: "Bez Szumu",
    description: "Najbardziej merytoryczne polskie wywiady geopolityczne, bez clickbaitów.",
    start_url: "/",
    display: "standalone",
    lang: "pl",
    background_color: "#0b1220",
    theme_color: "#0b1220",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}

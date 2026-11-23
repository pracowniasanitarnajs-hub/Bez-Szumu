export type TranscriptSegment = { offsetSeconds: number; text: string };

// Supadata: GET /v1/transcript. Zweryfikuj format odpowiedzi z aktualną dokumentacją Supadata.
// Dla długich filmów API może zwrócić 202 + jobId (przetwarzanie asynchroniczne) — obsługujemy odpytywanie.
export async function fetchTranscript(youtubeVideoId: string): Promise<TranscriptSegment[]> {
  const key = process.env.SUPADATA_API_KEY;
  if (!key) throw new Error("Brak SUPADATA_API_KEY");
  const headers = { "x-api-key": key };
  const videoUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;

  let res = await fetch(
    `https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(videoUrl)}&lang=pl&text=false`,
    { headers, cache: "no-store" },
  );

  if (res.status === 202) {
    const { jobId } = await res.json();
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      res = await fetch(`https://api.supadata.ai/v1/transcript/${jobId}`, { headers, cache: "no-store" });
      if (!res.ok) throw new Error(`Supadata job: HTTP ${res.status}`);
      const job = await res.json();
      if (job.status === "completed") return toSegments(job.content);
      if (job.status === "failed") throw new Error(`Supadata job failed: ${job.error ?? "unknown"}`);
    }
    throw new Error("Supadata job: timeout");
  }

  if (!res.ok) throw new Error(`Supadata: HTTP ${res.status}`);
  const json = await res.json();
  return toSegments(json.content);
}

function toSegments(content: unknown): TranscriptSegment[] {
  if (!Array.isArray(content) || content.length === 0) throw new Error("Pusta transkrypcja");
  // offset w milisekundach
  return content.map((c: any) => ({ offsetSeconds: Math.round((c.offset ?? 0) / 1000), text: String(c.text ?? "") }));
}

// Tekst z markerami czasu co ~60 s, żeby model mógł podawać wiarygodne minuty.
export function transcriptToPromptText(segments: TranscriptSegment[]): string {
  let out = "";
  let nextMark = 0;
  for (const s of segments) {
    if (s.offsetSeconds >= nextMark) {
      out += `\n[${formatTime(s.offsetSeconds)}] `;
      nextMark = s.offsetSeconds + 60;
    }
    out += s.text + " ";
  }
  return out.trim();
}

export function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

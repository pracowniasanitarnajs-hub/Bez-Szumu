export type Analysis = {
  score: number;
  clickbaitLevel: "Niski" | "Średni" | "Wysoki";
  clickbaitNote: string;
  summary: string[];
  timestamps: { t: number; label: string }[];
  guest: string | null;
  tags: string[];
  format: "Wywiad" | "Live" | "Q&A" | "Inny";
  noisePercent: number; // udział treści niemerytorycznej (0-100)
};

const FORMATS = ["Wywiad", "Live", "Q&A", "Inny"] as const;

const RUBRIC = `Jesteś redaktorem polskiego serwisu rankingującego wywiady geopolityczne. Oceń wywiad na podstawie transkrypcji (z markerami czasu [m:ss] lub [h:mm:ss]).
Zwróć WYŁĄCZNIE obiekt JSON (bez markdown) o polach:
- "score": liczba 1-10 (jedna cyfra po przecinku) — merytoryka wg gęstości twardych konkretów: daty, liczby, traktaty, nazwy, weryfikowalne fakty vs ogólniki i opinie. Nie nagradzaj długości ani pewnego tonu.
  OCENIAJ WYŁĄCZNIE FRAGMENTY MERYTORYCZNE. Całkowicie pomiń reklamy, pozdrowienia, prośby o lajki i wsparcie, czytanie czatu, zapowiedzi książek i spotkań oraz dygresje niezwiązane z tematem: nie wpływają na ocenę w żadną stronę.
  Używaj pełnej skali. Kotwice:
  1-2: prawie wyłącznie opinie i ogólniki, brak weryfikowalnych danych.
  3: dużo ogólników i spekulacji, pojedyncze fakty bez szczegółów.
  5: mieszanka — część twierdzeń oparta na datach, liczbach lub nazwach, reszta to komentarz i domysły; fakty słabo oddzielone od opinii.
  7: większość merytorycznych fragmentów oparta na konkretach (daty, liczby, nazwy, dokumenty), fakty wyraźnie oddzielone od opinii, rozmówca przyznaje niepewność.
  9: gęsta, wielowątkowa analiza z wieloma weryfikowalnymi danymi, kontekstem historycznym lub prawnym, kontrargumentami i rozróżnieniem faktu, opinii i hipotezy.
  Dobry, rzetelny wywiad to zwykle 6-8; oceny 9-10 są rzadkie, ale możliwe.
- "noise_percent": liczba całkowita 0-100 — szacowany udział czasu rozmowy zajętego treścią niemerytoryczną (reklamy, pozdrowienia, czat, dygresje). Informacja pomocnicza, nie obniża "score".
- "format": "Wywiad" (rozmowa prowadzącego z gościem) | "Live" (transmisja na żywo, głównie monolog prowadzącego) | "Q&A" (głównie odpowiedzi na pytania widzów) | "Inny".
- "clickbait_level": "Niski" | "Średni" | "Wysoki" — zgodność tytułu z faktyczną treścią rozmowy.
- "clickbait_note": 1 zdanie, neutralny opis zgodności tytułu z treścią, bez oskarżeń i ocen moralnych.
- "summary": tablica 3-4 wniosków WŁASNYMI SŁOWAMI (nie cytuj, nie kopiuj fragmentów transkrypcji), po 1-2 zdania.
- "timestamps": 5-10 obiektów {"t": sekundy_od_początku (liczba całkowita), "label": krótki opis} — najciekawsze momenty; podawaj tylko czasy, które faktycznie wynikają z markerów.
- "guest": imię i nazwisko gościa lub null, jeśli nie da się ustalić.
- "tags": 2-6 tagów z #, np. #Bałtyk #USA #Chiny #Ukraina #Rosja #Energetyka #Wojsko #Historia #NATO #UE.
Odpowiadaj po polsku.`;

export async function analyzeTranscript(opts: {
  title: string;
  channelName: string;
  durationSeconds: number;
  transcriptText: string;
}): Promise<{ analysis: Analysis; model: string }> {
  const provider = process.env.AI_PROVIDER ?? "anthropic";
  const model = process.env.AI_MODEL ?? "claude-sonnet-5-5";
  const user =
    `Tytuł: ${opts.title}\nKanał: ${opts.channelName}\nDługość: ${opts.durationSeconds} s\n\nTRANSKRYPCJA:\n${opts.transcriptText}`;

  const text = provider === "gemini" ? await callGemini(model, user) : await callAnthropic(model, user);
  const analysis = validate(parseJson(text), opts.durationSeconds);
  return { analysis, model };
}

async function callAnthropic(model: string, user: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Brak ANTHROPIC_API_KEY");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 2000, system: RUBRIC, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`Anthropic: HTTP ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.content?.map((b: any) => b.text ?? "").join("") ?? "";
}

async function callGemini(model: string, user: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Brak GEMINI_API_KEY");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: RUBRIC }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini: HTTP ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
}

function parseJson(text: string): any {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("Odpowiedź AI nie zawiera JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function validate(j: any, durationSeconds: number): Analysis {
  const score = Number(j.score);
  if (!Number.isFinite(score) || score < 1 || score > 10) throw new Error("Nieprawidłowy score");
  const level = j.clickbait_level;
  if (!["Niski", "Średni", "Wysoki"].includes(level)) throw new Error("Nieprawidłowy clickbait_level");
  const summary = Array.isArray(j.summary) ? j.summary.map(String).slice(0, 4) : [];
  if (summary.length < 3) throw new Error("Za mało wniosków w summary");
  // Odrzucamy minuty spoza długości filmu (ochrona przed halucynacjami).
  const timestamps = (Array.isArray(j.timestamps) ? j.timestamps : [])
    .map((t: any) => ({ t: Math.round(Number(t.t)), label: String(t.label ?? "") }))
    .filter((t: any) => Number.isFinite(t.t) && t.t >= 0 && t.t <= durationSeconds && t.label)
    .sort((a: any, b: any) => a.t - b.t);
  const tags = (Array.isArray(j.tags) ? j.tags : [])
    .map((t: any) => String(t).trim())
    .filter(Boolean)
    .map((t: string) => (t.startsWith("#") ? t : `#${t}`))
    .slice(0, 6);
  return {
    score: Math.round(score * 10) / 10,
    clickbaitLevel: level,
    clickbaitNote: String(j.clickbait_note ?? ""),
    summary,
    timestamps,
    guest: j.guest ? String(j.guest) : null,
    tags,
    format: (FORMATS as readonly string[]).includes(j.format) ? j.format : "Inny",
    noisePercent: Number.isFinite(Number(j.noise_percent))
      ? Math.min(100, Math.max(0, Math.round(Number(j.noise_percent))))
      : 0,
  };
}

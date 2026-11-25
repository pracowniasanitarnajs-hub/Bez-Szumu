export const CRITERIA_KEYS = ["konkrety", "fakty_opinie", "kontekst", "struktura", "perspektywy"] as const;
export type Criteria = Record<(typeof CRITERIA_KEYS)[number], number>; // każde 0–2, krok 0,5

export type Analysis = {
  score: number; // suma kryteriów (1–10), liczona po stronie serwera
  criteria: Criteria | null;
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
- "criteria": obiekt z PIĘCIOMA ocenami merytorycznymi. Każda ocena to liczba 0, 0.5, 1, 1.5 lub 2 (krok 0,5). Nie podajesz oceny łącznej — policzy ją system.
  Oceniaj WYŁĄCZNIE fragmenty merytoryczne. Całkowicie pomiń reklamy, pozdrowienia, prośby o lajki i wsparcie, czytanie czatu, zapowiedzi książek i spotkań oraz dygresje niezwiązane z tematem: nie wpływają na ocenę w żadną stronę. Nie nagradzaj długości ani pewnego tonu.
  Oceniaj rozmowę na tle dobrych polskich rozmów publicystycznych na ten temat (nie na tle referatu naukowego). Używaj całej skali. Znaczenie punktów w każdym kryterium: 0 = brak; 0.5 = słabo; 1 = przeciętnie, ograniczone; 1.5 = solidnie, typowo dla dobrej rozmowy; 2 = wzorowo.
  Kryteria (klucze JSON):
  - "konkrety": gęstość sprawdzalnych szczegółów — daty, liczby, nazwy, miejsca, dokumenty, traktaty, wydarzenia. 0 = prawie same ogólniki i opinie; 1 = pojedyncze konkrety; 2 = konkrety padają regularnie i da się je zweryfikować.
  - "fakty_opinie": rozdzielenie faktów od opinii i hipotez. 0 = opinie podawane jak fakty; 1 = częściowe rozróżnienie; 2 = wyraźnie oddzielone, rozmówcy zaznaczają niepewność lub źródło.
  - "kontekst": tło historyczne, polityczne, prawne, gospodarcze; odniesienia do wcześniejszych wydarzeń i decyzji. 0 = brak tła; 1 = trochę; 2 = bogate, pomaga zrozumieć "dlaczego".
  - "struktura": uporządkowanie i głębia rozwinięcia wątków. 0 = chaotycznie i powierzchownie; 1 = czytelnie, ale płytko; 2 = wątki rozwinięte, wnioski wyciągnięte.
  - "perspektywy": różne punkty widzenia, kontrargumenty, ryzyka. 0 = jedna narracja bez żadnych zastrzeżeń; 1 = wspomniane inne stanowiska; 2 = rzetelnie przedstawione różne perspektywy lub kontrargumenty.
  Orientacyjnie: solidna, typowa dobra rozmowa daje sumę ok. 6–7,5; przeciętna 4,5–6; słaba 2–4; wybitna 8,5 i więcej. Spekulacje bez danych to niskie "konkrety" i "fakty_opinie", ale nie karz za to, że forma to rozmowa, a nie referat.
- "noise_percent": liczba całkowita 0-100 — szacowany udział czasu rozmowy zajętego treścią niemerytoryczną (reklamy, pozdrowienia, czat, dygresje). Informacja pomocnicza, nie wpływa na kryteria.
- "format": "Wywiad" (rozmowa prowadzącego z gościem) | "Live" (transmisja na żywo, głównie monolog prowadzącego) | "Q&A" (głównie odpowiedzi na pytania widzów) | "Inny".
- "clickbait_level": "Niski" | "Średni" | "Wysoki" — zgodność tytułu z faktyczną treścią rozmowy.
- "clickbait_note": 1 zdanie, neutralny opis zgodności tytułu z treścią, bez oskarżeń i ocen moralnych.
- "summary": tablica 3-4 wniosków WŁASNYMI SŁOWAMI (nie cytuj, nie kopiuj fragmentów transkrypcji), po 1-2 zdania.
- "timestamps": 5-10 obiektów {"t": sekundy_od_początku (liczba całkowita), "label": krótki opis} — najciekawsze momenty; podawaj tylko czasy, które faktycznie wynikają z markerów.
- "guest": imię i nazwisko gościa lub null, jeśli nie da się ustalić.
- "tags": 2-6 tagów z #, np. #Bałtyk #USA #Chiny #Ukraina #Rosja #Energetyka #Wojsko #Historia #NATO #UE.
ZASADY NEUTRALNOŚCI (obowiązkowe, dotyczą "clickbait_note", "summary" i etykiet):
- Oceniasz MATERIAŁ, nigdy osoby. Nie oceniaj intencji, uczciwości, wiarygodności ani motywów prowadzącego, gościa ani kanału. Zakazane są słowa i sugestie typu: kłamstwo, manipulacja, dezinformacja, propaganda, oszustwo, wprowadzanie w błąd, celowe.
- "clickbait_note" opisuje wyłącznie porównanie: co obiecuje tytuł i czy rozmowa to potwierdza (np. "Tytuł zapowiada X; w rozmowie X zajmuje ok. Y czasu, a pozostała część dotyczy Z.").
- Cudze twierdzenia relacjonuj z przypisaniem ("według prowadzącego", "gość uważa"), nie podawaj ich jako ustalonych faktów. Jeśli twierdzenie jest sporne lub niepotwierdzone w rozmowie, zaznacz to wprost.
- Nie dodawaj informacji spoza transkrypcji i nie uzupełniaj faktów z własnej wiedzy.
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
  // Ocena łączna = suma pięciu kryteriów (0–2, krok 0,5), liczona tutaj, a nie zgadywana przez model.
  let criteria: Criteria | null = null;
  let score: number;
  if (j.criteria && typeof j.criteria === "object") {
    const c = {} as Criteria;
    for (const k of CRITERIA_KEYS) {
      const v = Number(j.criteria[k]);
      if (!Number.isFinite(v)) throw new Error(`Brak kryterium: ${k}`);
      c[k] = Math.min(2, Math.max(0, Math.round(v * 2) / 2));
    }
    criteria = c;
    score = CRITERIA_KEYS.reduce((s, k) => s + c[k], 0);
  } else {
    score = Number(j.score); // zgodność wsteczna: model zwrócił tylko ocenę łączną
  }
  if (!Number.isFinite(score) || score > 10) throw new Error("Nieprawidłowa ocena");
  score = Math.max(1, score);
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
    criteria,
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

import { createAdminClient } from "@/lib/supabase/admin";

export const VOTES_PER_MONTH = 3;

export type PollItem = {
  id: string;
  name: string;
  url: string | null;
  status: "open" | "added" | "rejected";
  votes: number;
  mine: boolean;
};

export type Poll = {
  month: string; // RRRR-MM (czas polski)
  items: PollItem[]; // bieżący miesiąc, bez odrzuconych, od największej liczby głosów
  myVotes: number;
  previous: { month: string; items: PollItem[] }; // wyniki poprzedniego miesiąca (TOP 5)
  ready: boolean; // false, gdy tabel jeszcze nie ma (migracja 0008)
};

export function pollMonth(ms = Date.now()): string {
  return new Date(ms).toLocaleDateString("sv-SE", { timeZone: "Europe/Warsaw" }).slice(0, 7);
}

export function previousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

const MONTHS = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"];
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

// Klucz porównania nazw: „@HistoriaRealna", „Historia Realna" i „historia-realna" to ta sama propozycja.
export function nameKey(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]/g, "");
}

type Row = { id: string; month: string; name: string; url: string | null; status: PollItem["status"]; channel_suggestion_votes: { user_id: string }[] };

function toItems(rows: Row[], userId: string | null): PollItem[] {
  return rows
    .filter((r) => r.status !== "rejected")
    .map((r) => ({
      id: r.id,
      name: r.name,
      url: r.url,
      status: r.status,
      votes: r.channel_suggestion_votes.length,
      mine: !!userId && r.channel_suggestion_votes.some((v) => v.user_id === userId),
    }))
    .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name, "pl"));
}

export async function getPoll(userId: string | null): Promise<Poll> {
  const month = pollMonth();
  const prev = previousMonth(month);
  const empty: Poll = { month, items: [], myVotes: 0, previous: { month: prev, items: [] }, ready: false };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return empty;
  const { data, error } = await createAdminClient()
    .from("channel_suggestions")
    .select("id, month, name, url, status, channel_suggestion_votes(user_id)")
    .in("month", [month, prev])
    .limit(2000);
  if (error || !data) return empty;
  const rows = data as unknown as Row[];
  const items = toItems(rows.filter((r) => r.month === month), userId);
  return {
    month,
    items,
    myVotes: items.filter((i) => i.mine).length,
    previous: { month: prev, items: toItems(rows.filter((r) => r.month === prev), null).filter((i) => i.votes > 0).slice(0, 5) },
    ready: true,
  };
}

// Dla /admin: wszystkie propozycje (łącznie z odrzuconymi) z danego miesiąca.
export async function getPollForAdmin(month: string): Promise<PollItem[]> {
  const { data, error } = await createAdminClient()
    .from("channel_suggestions")
    .select("id, month, name, url, status, channel_suggestion_votes(user_id)")
    .eq("month", month)
    .limit(2000);
  if (error || !data) return [];
  return (data as unknown as Row[])
    .map((r) => ({ id: r.id, name: r.name, url: r.url, status: r.status, votes: r.channel_suggestion_votes.length, mine: false }))
    .sort((a, b) => b.votes - a.votes);
}

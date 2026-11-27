"use server";

import { refresh } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { VOTES_PER_MONTH, nameKey, pollMonth } from "@/lib/channel-poll";

type Result = { ok: boolean; message?: string };
const NEW_PER_MONTH = 5; // limit nowych propozycji na osobę (ochrona przed zaśmiecaniem)

async function currentUser(): Promise<string | null> {
  const { data } = await (await createSupabaseServer()).auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
}

async function myVoteCount(userId: string, month: string): Promise<number> {
  const { count } = await createAdminClient()
    .from("channel_suggestion_votes")
    .select("suggestion_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("month", month);
  return count ?? 0;
}

export async function suggestChannel(_prev: Result | null, formData: FormData): Promise<Result> {
  const userId = await currentUser();
  if (!userId) return { ok: false, message: "Zaloguj się, aby zaproponować kanał." };

  const name = String(formData.get("name") ?? "").replace(/\s+/g, " ").trim();
  const url = String(formData.get("url") ?? "").trim() || null;
  const key = nameKey(name);
  if (name.length < 2 || name.length > 80 || key.length < 2) return { ok: false, message: "Podaj nazwę kanału (2–80 znaków)." };
  if (url && (url.length > 300 || !/^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(url)))
    return { ok: false, message: "Link musi prowadzić do YouTube (https://www.youtube.com/...)." };

  const db = createAdminClient();
  const month = pollMonth();

  const { data: channels } = await db.from("channels").select("name, handle");
  if ((channels ?? []).some((c) => nameKey(c.name) === key || (c.handle && nameKey(c.handle) === key)))
    return { ok: false, message: "Ten kanał już jest na liście." };

  const { data: existing } = await db
    .from("channel_suggestions")
    .select("id, status")
    .eq("month", month)
    .eq("name_key", key)
    .maybeSingle();

  let id = existing?.id as string | undefined;
  if (existing?.status === "rejected") return { ok: false, message: "Ta propozycja została już sprawdzona i odrzucona w tym miesiącu." };

  if (!id) {
    const { count } = await db
      .from("channel_suggestions")
      .select("id", { count: "exact", head: true })
      .eq("month", month)
      .eq("created_by", userId);
    if ((count ?? 0) >= NEW_PER_MONTH) return { ok: false, message: `Możesz dodać maksymalnie ${NEW_PER_MONTH} propozycji w miesiącu.` };
    const { data: row, error } = await db
      .from("channel_suggestions")
      .insert({ month, name, name_key: key, url, created_by: userId })
      .select("id")
      .single();
    if (error) {
      console.error("[poll]", error.message);
      return { ok: false, message: "Nie udało się zapisać propozycji." };
    }
    id = row.id as string;
  }

  // Propozycja = od razu Twój głos (jeśli masz jeszcze wolne).
  const { data: voted } = await db.from("channel_suggestion_votes").select("suggestion_id").eq("suggestion_id", id).eq("user_id", userId).maybeSingle();
  let message = existing ? "Ktoś już to zaproponował — dodaliśmy Twój głos." : "Dziękujemy! Propozycja dodana z Twoim głosem.";
  if (voted) message = "Ta propozycja już jest i masz na nią głos.";
  else if ((await myVoteCount(userId, month)) >= VOTES_PER_MONTH)
    message = existing
      ? `Ta propozycja już jest, ale wszystkie ${VOTES_PER_MONTH} głosy są już wykorzystane. Odbierz głos innej, aby zagłosować.`
      : `Propozycja dodana. Wszystkie ${VOTES_PER_MONTH} głosy są już wykorzystane, więc nie dostała Twojego głosu.`;
  else await db.from("channel_suggestion_votes").insert({ suggestion_id: id, user_id: userId, month });

  refresh();
  return { ok: true, message };
}

export async function toggleVote(suggestionId: string): Promise<Result> {
  const userId = await currentUser();
  if (!userId) return { ok: false, message: "Zaloguj się, aby głosować." };
  if (!/^[0-9a-f-]{36}$/i.test(suggestionId)) return { ok: false, message: "Nieprawidłowa propozycja." };

  const db = createAdminClient();
  const month = pollMonth();
  const { data: s } = await db.from("channel_suggestions").select("id, month, status").eq("id", suggestionId).maybeSingle();
  if (!s || s.month !== month || s.status === "rejected") return { ok: false, message: "Głosowanie na tę propozycję jest zamknięte." };

  const { data: voted } = await db.from("channel_suggestion_votes").select("suggestion_id").eq("suggestion_id", suggestionId).eq("user_id", userId).maybeSingle();
  if (voted) {
    await db.from("channel_suggestion_votes").delete().eq("suggestion_id", suggestionId).eq("user_id", userId);
  } else {
    if ((await myVoteCount(userId, month)) >= VOTES_PER_MONTH)
      return { ok: false, message: `Masz ${VOTES_PER_MONTH} głosy w miesiącu. Odbierz głos innej propozycji, aby zagłosować.` };
    const { error } = await db.from("channel_suggestion_votes").insert({ suggestion_id: suggestionId, user_id: userId, month });
    if (error) return { ok: false, message: "Nie udało się zapisać głosu." };
  }
  refresh();
  return { ok: true };
}

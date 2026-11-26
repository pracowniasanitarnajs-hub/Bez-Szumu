"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { ADMIN_COOKIE, isAdmin, passwordMatches, sessionToken } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { processVideos } from "@/lib/pipeline/process";
import { ensureDailyPost, publishPost } from "@/lib/social/daily-post";
import { facebookConfigured } from "@/lib/social/facebook";

async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Brak uprawnień");
}

function done(msg: string): never {
  updateTag("ranking");
  redirect(`/admin?msg=${encodeURIComponent(msg)}`);
}

export async function login(formData: FormData) {
  const pw = String(formData.get("password") ?? "");
  if (!passwordMatches(pw)) {
    await new Promise((r) => setTimeout(r, 800)); // spowolnienie zgadywania
    redirect("/admin?err=1");
  }
  (await cookies()).set(ADMIN_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete({ name: ADMIN_COOKIE, path: "/admin" });
  redirect("/admin");
}

export async function setStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!["pending", "published", "skipped", "queued"].includes(status)) throw new Error("Zły status");
  const { error } = await createAdminClient()
    .from("videos")
    .update({ status, updated_at: new Date().toISOString(), ...(status === "queued" ? { attempts: 0, error: null } : {}) })
    .eq("id", id);
  if (error) throw error;
  done(status === "published" ? "Opublikowano" : "Zmieniono status");
}

export async function saveEditor(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const scoreRaw = String(formData.get("score") ?? "").replace(",", ".").trim();
  const comment = String(formData.get("comment") ?? "").trim();
  let editor_score: number | null = null;
  if (scoreRaw !== "") {
    editor_score = Math.round(parseFloat(scoreRaw) * 10) / 10;
    if (!Number.isFinite(editor_score) || editor_score < 1 || editor_score > 10) throw new Error("Ocena 1–10");
  }
  const { error } = await createAdminClient()
    .from("analyses")
    .update({ editor_score, editor_comment: comment || null })
    .eq("video_id", id);
  if (error) throw error;
  done("Zapisano korektę");
}

// UC... (ID), link /channel/UC..., albo @handle / link /@handle (rozwiązywane przez YouTube API).
export async function addChannel(formData: FormData) {
  await requireAdmin();
  const raw = String(formData.get("channel") ?? "").trim();
  if (!raw) done("Podaj link lub ID kanału");

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("Brak YOUTUBE_API_KEY");

  let query: string;
  const idMatch = /(UC[\w-]{22})/.exec(raw);
  const handleMatch = /@([\w.\-]+)/.exec(raw);
  if (idMatch) query = `id=${idMatch[1]}`;
  else if (handleMatch) query = `forHandle=${encodeURIComponent("@" + handleMatch[1])}`;
  else done("Nie rozpoznano kanału (podaj ID UC..., link /channel/... lub @nazwa)");

  const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&${query}&key=${key}`, { cache: "no-store" });
  const json = await res.json();
  const ch = json.items?.[0];
  if (!ch) done("Nie znaleziono kanału na YouTube");

  const { error } = await createAdminClient()
    .from("channels")
    .upsert(
      { youtube_channel_id: ch.id, name: ch.snippet.title, handle: ch.snippet.customUrl ?? null, active: true },
      { onConflict: "youtube_channel_id" },
    );
  if (error) throw error;
  done(`Dodano kanał: ${ch.snippet.title}`);
}

export async function toggleChannel(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const active = String(formData.get("active")) === "true";
  const { error } = await createAdminClient().from("channels").update({ active }).eq("id", id);
  if (error) throw error;
  done(active ? "Kanał włączony" : "Kanał wyłączony");
}

// ===== Facebook: posty dzienne =====
export async function createPostNow() {
  await requireAdmin();
  const r = await ensureDailyPost({ force: true });
  done(`Post za wczoraj: ${r}`);
}

export async function savePost(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const message = String(formData.get("message") ?? "").trim();
  const link = String(formData.get("link") ?? "").trim() || null;
  const intent = String(formData.get("intent") ?? "save");
  if (!message) done("Treść posta nie może być pusta");
  if (link && !/^https:\/\//.test(link)) done("Link musi zaczynać się od https://");
  const db = createAdminClient();
  if (intent === "skip") {
    await db.from("social_posts").update({ status: "skipped" }).eq("id", id);
    done("Post pominięty");
  }
  const { error } = await db.from("social_posts").update({ message, link, ...(intent === "publish" ? {} : { status: "draft" }) }).eq("id", id);
  if (error) throw error;
  if (intent === "publish") {
    if (!facebookConfigured()) done("Facebook nie jest jeszcze podłączony (FACEBOOK_PAGE_ID i FACEBOOK_PAGE_TOKEN w Render)");
    try {
      await publishPost(id);
    } catch (e) {
      done(`Błąd publikacji: ${e instanceof Error ? e.message.slice(0, 200) : String(e)}`);
    }
    done("Opublikowano na Facebooku");
  }
  done("Zapisano szkic");
}

export async function runNow() {
  await requireAdmin();
  const r = await processVideos();
  done(
    `Sprawdzono: nowe ${r.discovered}, pominięte ${r.skipped}, przetworzone ${r.processed}, błędy ${r.failed}` +
      (r.errors.length ? ` (${r.errors[0].slice(0, 120)})` : ""),
  );
}

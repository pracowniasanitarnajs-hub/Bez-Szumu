import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccess } from "@/lib/session";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SiteHeader } from "../site-header";
import { SiteFooter } from "../site-footer";
import { PlanPicker } from "../plan-picker";
import { DeleteAccountForm } from "./delete-form";

export const metadata: Metadata = { title: "Moje konto — Bez Szumu", robots: { index: false } };

const NOTICE: Record<string, string> = {
  ok: "Dziękujemy! Płatność przyjęta. Pełny dostęp włączy się w ciągu kilkunastu sekund (odśwież stronę, jeśli status się nie zmienił).",
  anulowano: "Płatność została przerwana. Nic nie pobraliśmy.",
  zgoda: "Aby kupić dostęp, zaznacz zgodę na rozpoczęcie świadczenia usługi.",
  blad: "Nie udało się połączyć z systemem płatności. Spróbuj ponownie za chwilę.",
  niedostepna: "Płatności nie są jeszcze dostępne.",
};

export default function AccountPage({ searchParams }: { searchParams: Promise<{ platnosc?: string }> }) {
  return (
    <>
      <SiteHeader active="none" />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl">Moje konto</h1>
        <Suspense fallback={<p className="mt-6 text-muted">Ładowanie…</p>}>
          <AccountDetails searchParams={searchParams} />
        </Suspense>
        <SiteFooter />
      </main>
    </>
  );
}

async function AccountDetails({ searchParams }: { searchParams: Promise<{ platnosc?: string }> }) {
  const access = await getAccess();
  if (access.level === "guest") redirect("/login");
  const { platnosc } = await searchParams;
  const notice = platnosc ? NOTICE[platnosc] : undefined;

  const { data: claimsData } = await (await createSupabaseServer()).auth.getClaims();
  const claims = claimsData?.claims;
  const { data: p } = claims?.sub
    ? await createAdminClient()
        .from("profiles")
        .select("stripe_customer_id, current_period_end, cancel_at_period_end, subscription_status")
        .eq("id", claims.sub)
        .maybeSingle()
    : { data: null };
  const periodEnd = p?.current_period_end
    ? new Date(p.current_period_end).toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw" })
    : null;

  const status =
    access.level === "trial"
      ? `Okres próbny: pozostało ${access.daysLeft} ${access.daysLeft === 1 ? "dzień" : "dni"}`
      : access.level === "active"
        ? access.isAdmin && p?.subscription_status !== "active"
          ? "Konto administratora (pełny dostęp)"
          : p?.cancel_at_period_end && periodEnd
            ? `Subskrypcja aktywna do ${periodEnd} (wypowiedziana, nie odnowi się)`
            : periodEnd
              ? `Subskrypcja aktywna, następne odnowienie ${periodEnd}`
              : "Subskrypcja aktywna"
        : p?.subscription_status === "past_due"
          ? "Płatność nie powiodła się — zaktualizuj metodę płatności"
          : "Brak aktywnego dostępu";

  return (
    <div className="mt-6 space-y-8">
      {notice && <p className="rounded-xl border border-accent/40 bg-accent/5 p-3 text-sm">{notice}</p>}

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted">Zalogowany jako</dt>
            <dd className="font-semibold">{access.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Status</dt>
            <dd className="font-semibold">{status}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          {p?.stripe_customer_id && (
            <form action="/konto/portal" method="post">
              <button className="min-h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-white dark:text-slate-900">
                Zarządzaj subskrypcją
              </button>
            </form>
          )}
          <form action="/auth/signout" method="post">
            <button className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold hover:border-accent">Wyloguj</button>
          </form>
        </div>
        {p?.stripe_customer_id && (
          <p className="mt-2 text-xs text-muted">Zmiana karty, rezygnacja z odnawiania i historia płatności (bezpieczny panel Stripe).</p>
        )}
      </section>

      {access.level !== "active" && (
        <section className="rounded-2xl border border-accent/40 bg-accent/5 p-4 sm:p-5">
          <h2 className="text-lg font-bold">{access.level === "trial" ? "Wykup dostęp" : "Wróć do pełnego dostępu"}</h2>
          {access.level === "trial" && (
            <p className="mt-2 text-sm text-muted">Zakup w trakcie okresu próbnego od razu włącza płatną subskrypcję.</p>
          )}
          <PlanPicker />
        </section>
      )}

      <section className="rounded-2xl border border-rose-500/40 p-4 sm:p-5">
        <h2 className="text-lg font-bold">Usuń konto</h2>
        <p className="mt-2 text-sm text-muted">
          Usunięcie konta jest <strong>trwałe i natychmiastowe</strong>: usuwamy Twój profil i dane dostępu w Serwisie (z wyjątkiem dokumentów, które musimy przechowywać na podstawie przepisów, np. księgowych). Aktywna subskrypcja zostanie automatycznie anulowana (bez zwrotu za bieżący okres). Po usunięciu możesz założyć nowe konto, ale nie otrzymasz ponownie darmowego okresu próbnego dla tego samego konta Google lub Apple, jeśli je już wykorzystałeś.
        </p>
        <DeleteAccountForm />
        <p className="mt-3 text-xs text-muted">
          Więcej o danych znajdziesz w <Link href="/polityka-prywatnosci" className="underline">Polityce prywatności</Link>.
        </p>
      </section>
    </div>
  );
}

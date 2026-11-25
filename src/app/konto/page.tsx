import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccess } from "@/lib/session";
import { SiteHeader } from "../site-header";
import { SiteFooter } from "../site-footer";
import { DeleteAccountForm } from "./delete-form";

export const metadata: Metadata = { title: "Moje konto — Bez Szumu", robots: { index: false } };

export default function AccountPage() {
  return (
    <>
      <SiteHeader active="none" />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl">Moje konto</h1>
        <Suspense fallback={<p className="mt-6 text-muted">Ładowanie…</p>}>
          <AccountDetails />
        </Suspense>
        <SiteFooter />
      </main>
    </>
  );
}

async function AccountDetails() {
  const access = await getAccess();
  if (access.level === "guest") redirect("/login");

  const status =
    access.level === "trial"
      ? `Okres próbny: pozostało ${access.daysLeft} ${access.daysLeft === 1 ? "dzień" : "dni"}`
      : access.level === "active"
        ? access.isAdmin
          ? "Konto administratora (pełny dostęp)"
          : "Subskrypcja aktywna"
        : "Okres próbny zakończony";

  return (
    <div className="mt-6 space-y-8">
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
        <form action="/auth/signout" method="post" className="mt-4">
          <button className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold hover:border-accent">
            Wyloguj
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-rose-500/40 p-4 sm:p-5">
        <h2 className="text-lg font-bold">Usuń konto</h2>
        <p className="mt-2 text-sm text-muted">
          Usunięcie konta jest <strong>trwałe i natychmiastowe</strong>: usuwamy Twój profil i dane dostępu w Serwisie (z wyjątkiem dokumentów, które musimy przechowywać na podstawie przepisów, np. księgowych). Jeśli masz aktywną płatną subskrypcję, najpierw ją wypowiedz. Po usunięciu możesz założyć nowe konto, ale nie otrzymasz ponownie darmowego okresu próbnego dla tego samego konta Google lub Apple, jeśli je już wykorzystałeś.
        </p>
        <DeleteAccountForm />
        <p className="mt-3 text-xs text-muted">
          Więcej o danych znajdziesz w <Link href="/polityka-prywatnosci" className="underline">Polityce prywatności</Link>.
        </p>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "../../site-header";
import { SiteFooter } from "../../site-footer";

export const metadata: Metadata = { title: "Konto usunięte — Bez Szumu", robots: { index: false } };

export default function DeletedPage() {
  return (
    <>
      <SiteHeader active="none" />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold leading-tight">Konto zostało usunięte</h1>
        <p className="mt-3 text-muted">
          Twoje dane w Serwisie zostały usunięte. Dziękujemy, że z nami byłeś. Jeśli zmienisz zdanie, zawsze możesz założyć nowe konto.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-white dark:text-slate-900"
        >
          Wróć na stronę główną
        </Link>
        <SiteFooter />
      </main>
    </>
  );
}

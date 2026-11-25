import { Suspense } from "react";
import Link from "next/link";
import { getRanking } from "@/lib/ranking";
import { getAccess, hasFullAccess } from "@/lib/session";
import { RankingList } from "./ranking-list";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { Paywall } from "./paywall";
import { LoginWall } from "./login-wall";

const GUEST_PREVIEW = 3;

export default function Home() {
  return (
    <>
      <SiteHeader active="ranking" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <section className="mb-6">
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
            Najlepsze polskie wywiady geopolityczne. Bez clickbaitów.
          </h1>
          <p className="mt-2 text-muted">
            Codziennie oceniamy nowe rozmowy z polskich kanałów: merytoryka, zgodność tytułu z treścią, wnioski i znaczniki czasu.
          </p>
        </section>

        <Suspense fallback={<p className="py-10 text-center text-muted">Ładowanie rankingu…</p>}>
          <RankingSection />
        </Suspense>

        <SiteFooter />
      </main>
    </>
  );
}

// Dostęp egzekwowany na serwerze: do przeglądarki trafia tylko to, co użytkownik może zobaczyć.
async function RankingSection() {
  const access = await getAccess();

  // Logowanie wymagane do wejścia (domyślnie). Wyłączysz: REQUIRE_LOGIN=false w Render → Environment.
  const requireLogin = process.env.REQUIRE_LOGIN !== "false";
  if (access.level === "guest" && requireLogin) return <LoginWall />;

  // Dopóki nie ma płatności: GUEST_FULL_ACCESS (domyślnie włączone) = zalogowani widzą wszystko także po
  // trialu. Ustaw GUEST_FULL_ACCESS=false, aby po trialu pokazywać Paywall i 3 filmy.
  const open = process.env.GUEST_FULL_ACCESS !== "false";
  const { items, demo } = await getRanking();
  const full = open || hasFullAccess(access);
  const visible = full
    ? items
    : [...items]
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        .slice(0, GUEST_PREVIEW);

  return (
    <>
      {!open && access.level === "guest" && (
        <div className="mb-5 rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm">
          <p>
            Widzisz {Math.min(GUEST_PREVIEW, items.length)} najnowsze wywiady z {items.length}.{" "}
            <strong>Zaloguj się przez Google lub Apple i testuj pełny dostęp za darmo przez 30 dni</strong> (bez podawania karty).
          </p>
          <Link
            href="/login"
            className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-white dark:text-slate-900"
          >
            Zaloguj się i testuj 30 dni za darmo
          </Link>
        </div>
      )}
      {!open && access.level === "expired" && <Paywall />}
      {demo && (
        <p className="mb-3 text-xs text-muted">Tryb demonstracyjny: dane przykładowe, baza nie jest jeszcze podłączona.</p>
      )}

      <RankingList items={visible} />
    </>
  );
}

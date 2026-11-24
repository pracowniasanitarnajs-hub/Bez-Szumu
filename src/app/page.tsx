import { getRanking } from "@/lib/ranking";
import { RankingList } from "./ranking-list";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

export default async function Home() {
  const { items, demo } = await getRanking();

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
          <div className="mt-4 rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm">
            Zaloguj się przez Google lub Apple i testuj pełny dostęp za darmo przez 30 dni (bez podawania karty).
          </div>
          {demo && (
            <p className="mt-3 text-xs text-muted">Tryb demonstracyjny: dane przykładowe, baza nie jest jeszcze podłączona.</p>
          )}
        </section>

        <RankingList items={items} />

        <SiteFooter />
      </main>
    </>
  );
}

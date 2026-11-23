import { getRanking } from "@/lib/ranking";
import { RankingList } from "./ranking-list";

export default async function Home() {
  const { items, demo } = await getRanking();

  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <span className="text-lg font-bold tracking-tight">Bez Szumu</span>
          <span className="rounded-full bg-accent/10 px-3 py-1 text-xs text-accent">wersja robocza</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <section className="mb-6">
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
            Najlepsze polskie wywiady geopolityczne. Bez clickbaitów.
          </h1>
          <p className="mt-2 text-muted">
            Codziennie oceniamy nowe rozmowy powyżej 20 minut: merytoryka, zgodność tytułu z treścią, wnioski i znaczniki czasu.
          </p>
          <div className="mt-4 rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm">
            Zaloguj się przez Google lub Apple i testuj pełny dostęp za darmo przez 30 dni (bez podawania karty).
          </div>
          {demo && (
            <p className="mt-3 text-xs text-muted">Tryb demonstracyjny: dane przykładowe, baza nie jest jeszcze podłączona.</p>
          )}
        </section>

        <RankingList items={items} />

        <p className="mt-8 text-xs text-muted">
          Oceny są generowane automatycznie przez AI i mogą być korygowane przez redaktora. Serwis tylko linkuje do materiałów na YouTube.
        </p>
      </main>
    </>
  );
}

import Image from "next/image";
import Link from "next/link";

const NAV = [
  { key: "ranking", href: "/", label: "Ranking" },
  { key: "kanaly", href: "/kanaly", label: "Kanały" },
] as const;

export function SiteHeader({ active }: { active: "ranking" | "kanaly" }) {
  return (
    <header className="border-b border-border">
      <div className="bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-center px-4 py-3">
          <Link href="/" aria-label="Bez-Szumu.pl — strona główna" className="m-0 block">
            <Image
              src="/logo.png"
              alt="Bez-Szumu.pl — rzetelne treści w kontekście"
              width={1128}
              height={267}
              priority
              className="h-auto w-full max-w-[21rem] sm:max-w-md"
            />
          </Link>
        </div>
      </div>
      <nav aria-label="Główna nawigacja" className="mx-auto flex max-w-3xl gap-2 px-4 py-3">
        {NAV.map((n) => {
          const on = n.key === active;
          return (
            <Link
              key={n.key}
              href={n.href}
              aria-current={on ? "page" : undefined}
              className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold transition-colors ${
                on
                  ? "border-accent bg-accent text-white dark:text-slate-900"
                  : "border-border bg-card hover:border-accent"
              }`}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

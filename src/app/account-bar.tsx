import Link from "next/link";
import { getAccess } from "@/lib/session";

const pillBase = "inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold";
const pill = `${pillBase} border-border bg-card hover:border-accent`;
const pillPrimary = `${pillBase} border-accent bg-accent text-white dark:text-slate-900`;

// Przycisk logowania albo informacja o koncie. Czyta sesję, więc musi być w <Suspense>.
export async function AccountBar() {
  const access = await getAccess();

  if (access.level === "guest") {
    return (
      <Link href="/login" className={`${pillPrimary} ml-auto`}>
        Zaloguj się
      </Link>
    );
  }

  const status =
    access.level === "trial"
      ? `Okres próbny: ${access.daysLeft} ${access.daysLeft === 1 ? "dzień" : "dni"}`
      : access.level === "active"
        ? "Konto aktywne"
        : "Okres próbny zakończony";

  return (
    <div className="ml-auto flex min-w-0 items-center gap-2">
      <Link href="/konto" className="hidden min-w-0 truncate text-xs text-muted underline sm:block">
        {access.email}
      </Link>
      <span
        className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
          access.level === "expired" ? "bg-rose-500/15 text-rose-700 dark:text-rose-300" : "bg-accent/10 text-accent"
        }`}
      >
        {status}
      </span>
      <form action="/auth/signout" method="post">
        <button className={pill}>Wyloguj</button>
      </form>
    </div>
  );
}

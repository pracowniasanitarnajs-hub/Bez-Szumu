import Link from "next/link";

// Ekran dla niezalogowanych: treści serwisu są dostępne dopiero po zalogowaniu.
export function LoginWall({ title = "Zaloguj się, aby zobaczyć ranking" }: { title?: string }) {
  return (
    <section className="rounded-2xl border border-accent/30 bg-accent/5 p-5 sm:p-6">
      <h2 className="text-xl font-bold leading-tight">{title}</h2>
      <p className="mt-2 text-sm text-muted">
        Przy pierwszym logowaniu dostajesz <strong>30 dni pełnego dostępu za darmo, bez podawania karty</strong>. Wystarczy konto Google lub Apple.
      </p>
      <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm">
        <li>ocena merytoryczna każdej rozmowy (1–10),</li>
        <li>informacja, czy tytuł odpowiada treści,</li>
        <li>krótkie wnioski własnymi słowami i znaczniki czasu,</li>
        <li>filtry, tagi i wyszukiwarka po nazwisku eksperta lub temacie.</li>
      </ul>
      <Link
        href="/login"
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-5 text-base font-semibold text-white dark:text-slate-900 sm:w-auto"
      >
        Zaloguj się i testuj 30 dni za darmo
      </Link>
    </section>
  );
}

import Link from "next/link";

const link = "underline hover:text-foreground";

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-border pt-5 text-xs leading-relaxed text-muted">
      <nav aria-label="Dokumenty" className="mb-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link href="/regulamin" className={link}>
          Regulamin
        </Link>
        <Link href="/polityka-prywatnosci" className={link}>
          Polityka prywatności
        </Link>
        <Link href="/konto" className={link}>
          Moje konto
        </Link>
      </nav>
      <p>
        Oceny i streszczenia są generowane automatycznie przez AI. To subiektywna opinia o treści materiału, a nie o osobach, i może być korygowana przez redaktora. Serwis nie kopiuje ani nie przechowuje filmów: osadza oficjalny odtwarzacz YouTube i linkuje do oryginałów. Wszystkie nazwy, znaki i materiały należą do ich właścicieli.
        {process.env.NEXT_PUBLIC_CONTACT_EMAIL && (
          <>
            {" "}Zauważyłeś błąd lub chcesz sprostowania albo usunięcia materiału?{" "}
            <a className="underline" href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL}`}>
              Napisz do nas
            </a>
            .
          </>
        )}
      </p>
    </footer>
  );
}

export function SiteFooter() {
  return (
    <p className="mt-8 text-xs leading-relaxed text-muted">
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
  );
}

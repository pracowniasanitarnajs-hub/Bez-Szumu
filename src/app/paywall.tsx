// Ekran po wygaśnięciu okresu próbnego. Płatności (Stripe) zostaną podłączone w następnym kroku.
export function Paywall() {
  return (
    <section className="mb-6 rounded-2xl border border-accent/40 bg-accent/5 p-5">
      <h2 className="text-xl font-bold">Twój okres próbny dobiegł końca</h2>
      <p className="mt-2 text-sm text-muted">
        Wybierz plan, aby wrócić do pełnego dostępu: wszystkie oceny, wnioski, znaczniki czasu, filtry i wyszukiwarka. Poniżej nadal widzisz 3 najnowsze wywiady.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted">Miesięcznie</p>
          <p className="mt-1 text-2xl font-bold">15 zł</p>
          <p className="text-xs text-muted">/ miesiąc, możesz zrezygnować w każdej chwili</p>
          <button disabled className="mt-3 min-h-11 w-full rounded-xl bg-accent px-4 text-sm font-semibold text-white opacity-60 dark:text-slate-900">
            Płatności już wkrótce
          </button>
        </div>
        <div className="rounded-xl border border-accent bg-card p-4">
          <p className="text-sm text-muted">Rocznie <span className="ml-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">oszczędzasz 60 zł</span></p>
          <p className="mt-1 text-2xl font-bold">120 zł</p>
          <p className="text-xs text-muted">/ rok (10 zł miesięcznie)</p>
          <button disabled className="mt-3 min-h-11 w-full rounded-xl bg-accent px-4 text-sm font-semibold text-white opacity-60 dark:text-slate-900">
            Płatności już wkrótce
          </button>
        </div>
      </div>
    </section>
  );
}

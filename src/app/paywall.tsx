import { PlanPicker } from "./plan-picker";

// Ekran po wygaśnięciu okresu próbnego.
export function Paywall() {
  return (
    <section className="mb-6 rounded-2xl border border-accent/40 bg-accent/5 p-5">
      <h2 className="text-xl font-bold">Twój okres próbny dobiegł końca</h2>
      <p className="mt-2 text-sm text-muted">
        Wybierz plan, aby wrócić do pełnego dostępu: wszystkie oceny, wnioski, znaczniki czasu, filtry i wyszukiwarka. Poniżej nadal widzisz 3 najnowsze wywiady.
      </p>
      <PlanPicker />
    </section>
  );
}

import Link from "next/link";
import { stripeConfigured } from "@/lib/stripe";

const BTN = "mt-3 min-h-11 w-full rounded-xl bg-accent px-4 text-sm font-semibold text-white disabled:opacity-60 dark:text-slate-900";

// Wybór planu → POST /platnosc/checkout (Stripe Checkout: karta, Apple Pay, Google Pay).
export function PlanPicker() {
  const ready = stripeConfigured();
  return (
    <form action="/platnosc/checkout" method="post" className="mt-4">
      {ready && (
        <label className="mb-4 flex items-start gap-3 text-xs text-muted">
          <input type="checkbox" name="consent" required className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--accent)]" />
          <span>
            Żądam rozpoczęcia świadczenia usługi przed upływem 14 dni na odstąpienie od umowy i przyjmuję do wiadomości, że po
            udostępnieniu treści cyfrowych tracę prawo odstąpienia. Akceptuję{" "}
            <Link href="/regulamin" className="underline">Regulamin</Link>. Subskrypcja odnawia się automatycznie; możesz ją
            wypowiedzieć w każdej chwili w zakładce „Moje konto".
          </span>
        </label>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted">Miesięcznie</p>
          <p className="mt-1 text-2xl font-bold">15 zł</p>
          <p className="text-xs text-muted">/ miesiąc, możesz zrezygnować w każdej chwili</p>
          <button name="plan" value="monthly" disabled={!ready} className={BTN}>
            {ready ? "Wybieram miesięczny" : "Płatności już wkrótce"}
          </button>
        </div>
        <div className="rounded-xl border border-accent bg-card p-4">
          <p className="text-sm text-muted">
            Rocznie <span className="ml-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">oszczędzasz 60 zł</span>
          </p>
          <p className="mt-1 text-2xl font-bold">120 zł</p>
          <p className="text-xs text-muted">/ rok (10 zł miesięcznie)</p>
          <button name="plan" value="yearly" disabled={!ready} className={BTN}>
            {ready ? "Wybieram roczny" : "Płatności już wkrótce"}
          </button>
        </div>
      </div>
      {ready && (
        <p className="mt-3 text-xs text-muted">
          Płatność obsługuje Stripe: karta, Apple Pay lub Google Pay. Jeśli potrzebujesz faktury na firmę, podaj NIP w formularzu płatności.
        </p>
      )}
    </form>
  );
}

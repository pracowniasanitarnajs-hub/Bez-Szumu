import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteHeader } from "../site-header";
import { SiteFooter } from "../site-footer";
import { TERMS_VERSION } from "@/lib/legal";
import { LoginButtons } from "./login-buttons";

export const metadata: Metadata = {
  title: "Zaloguj się — Bez Szumu",
  robots: { index: false },
};

export default function LoginPage(props: { searchParams: Promise<{ [k: string]: string | string[] | undefined }> }) {
  return (
    <>
      <SiteHeader active="none" />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold leading-tight">Zaloguj się</h1>
        <p className="mt-2 text-muted">
          Przy pierwszym logowaniu dostajesz <strong>30 dni pełnego dostępu za darmo</strong>, bez podawania karty.
        </p>

        <Suspense fallback={null}>
          <ErrorNote searchParams={props.searchParams} />
        </Suspense>

        <div className="mt-6">
          <LoginButtons termsVersion={TERMS_VERSION} />
        </div>

        <p className="mt-6 text-xs leading-relaxed text-muted">
          Używamy wyłącznie logowania przez Google lub Apple, aby uniknąć zakładania wielu darmowych kont. Nie otrzymujemy Twojego hasła.
        </p>
        <SiteFooter />
      </main>
    </>
  );
}

async function ErrorNote({ searchParams }: { searchParams: Promise<{ [k: string]: string | string[] | undefined }> }) {
  const sp = await searchParams;
  if (!sp.err) return null;
  return (
    <p className="mt-4 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">
      {sp.err === "terms"
        ? "Aby się zalogować, zaznacz zgodę na Regulamin i Politykę prywatności."
        : "Logowanie się nie powiodło. Spróbuj ponownie."}
    </p>
  );
}

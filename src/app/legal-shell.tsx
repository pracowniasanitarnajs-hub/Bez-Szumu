import type { ReactNode } from "react";
import { LEGAL_DRAFT, TERMS_VERSION } from "@/lib/legal";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

export function LegalShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <SiteHeader active="none" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted">Wersja z dnia {TERMS_VERSION}</p>
        {LEGAL_DRAFT && (
          <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            Dokument w wersji roboczej: może zostać zmieniony przed oficjalnym uruchomieniem płatnego dostępu.
          </p>
        )}
        <div className="mt-6 space-y-3 text-[15px] leading-relaxed">{children}</div>
        <SiteFooter />
      </main>
    </>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="mt-8 text-lg font-bold">{children}</h2>;
}

export function P({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

export function Ul({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-6">{children}</ul>;
}

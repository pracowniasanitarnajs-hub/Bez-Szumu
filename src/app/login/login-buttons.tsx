"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/browser";

type Provider = "google" | "apple";

const base =
  "flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border px-4 text-base font-semibold transition-colors disabled:opacity-60";

export function LoginButtons() {
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: Provider) {
    setError(null);
    setBusy(provider);
    const { error } = await createSupabaseBrowser().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError("Nie udało się rozpocząć logowania. Spróbuj ponownie za chwilę.");
      setBusy(null);
    }
    // Przy sukcesie przeglądarka przechodzi do Google/Apple.
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => signIn("google")}
        className={`${base} border-border bg-white text-slate-900 hover:border-accent`}
      >
        <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
          <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.9 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
        </svg>
        {busy === "google" ? "Łączenie…" : "Kontynuuj z Google"}
      </button>

      <button
        type="button"
        disabled={busy !== null}
        onClick={() => signIn("apple")}
        className={`${base} border-black bg-black text-white hover:opacity-90`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
          <path d="M16.37 1.43c0 1.14-.46 2.22-1.2 3-.8.86-2.1 1.52-3.16 1.43-.13-1.1.4-2.25 1.1-2.98.8-.84 2.17-1.47 3.26-1.45zM20.5 17.1c-.55 1.27-.82 1.84-1.52 2.96-1 1.56-2.4 3.5-4.15 3.52-1.55.02-1.95-1-4.06-.99-2.1.01-2.55 1.01-4.1.99-1.75-.02-3.08-1.77-4.08-3.33C-.2 15.6-.5 10.9 1.4 8.3c1.34-1.84 3.46-2.92 5.45-2.92 2.03 0 3.3 1.11 4.98 1.11 1.63 0 2.62-1.11 4.97-1.11 1.77 0 3.65.96 4.99 2.62-4.39 2.4-3.68 8.67.71 9.1z" />
        </svg>
        {busy === "apple" ? "Łączenie…" : "Kontynuuj z Apple"}
      </button>

      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}

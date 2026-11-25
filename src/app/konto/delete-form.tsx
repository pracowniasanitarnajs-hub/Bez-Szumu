"use client";

import { useState } from "react";

export function DeleteAccountForm() {
  const [text, setText] = useState("");
  const ok = text.trim().toUpperCase() === "USUŃ";

  return (
    <form
      action="/konto/usun"
      method="post"
      className="mt-4 space-y-3"
      onSubmit={(e) => {
        if (!ok || !window.confirm("Na pewno trwale usunąć konto? Tej operacji nie można cofnąć.")) e.preventDefault();
      }}
    >
      <label className="block text-sm">
        Aby potwierdzić, wpisz <strong>USUŃ</strong>:
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
          className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-base"
        />
      </label>
      <button
        disabled={!ok}
        className="min-h-11 w-full rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
      >
        Usuń moje konto
      </button>
    </form>
  );
}

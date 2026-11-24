# Bez Szumu (bez-szumu.pl)

Polski serwis-kurator: automatycznie ocenia i rankinguje merytoryczne wywiady geopolityczne (wszystkie filmy z kanałów, min. 60 s — odfiltrowuje Shorts; `MIN_DURATION_SECONDS`) z wybranych polskich kanałów YouTube. Zamiast clickbaitów użytkownik dostaje ranking jakości, wnioski i znaczniki czasu.

## Zakres
- **Tylko strona WWW** (mobile-first, PWA: instalowalna z przeglądarki). Natywna aplikacja iOS/Android — dopiero później (np. Capacitor). Wtedy subskrypcje w sklepach muszą iść przez zakupy Apple/Google (RevenueCat), dlatego `profiles.subscription_status` ma być zasilane z wielu źródeł (Stripe web, później RevenueCat).
- Rynek: **tylko Polska**, język UI: polski.
- Pierwszy kanał: **Historia Realna** (Piotr Zychowicz). Dodajemy tag `#Historia`. Kolejne kanały dodaje admin w `/admin`.

## Stack
- Next.js (App Router, TypeScript, Tailwind CSS v4). UWAGA: to nowa wersja Next — przed pisaniem kodu sprawdź `node_modules/next/dist/docs/`.
- Supabase: PostgreSQL + Auth (tylko Google i Apple OAuth; e-mail+hasło wyłączone).
- Hosting: Render.com (Web Service Node.js + Cron Job). Sekrety wyłącznie w Environment Variables, nigdy w kodzie.
- AI: dostawca wymienny przez env (`AI_PROVIDER=anthropic|gemini`, `AI_MODEL`). Domyślnie Claude Sonnet 5.5 (`claude-sonnet-5-5`); przed wyborem porównać na 20–30 filmach z Gemini Flash.
- Transkrypcje: Supadata API. Długość filmu: YouTube Data API (RSS jej nie podaje).
- Płatności: **Stripe** (Checkout + Billing + webhook; BLIK/P24). Faktury z własnej spółki użytkownika, księgowość przez biuro rachunkowe. Plany: 15 zł/mies., 120 zł/rok.

## Pipeline (POST /api/cron/process-videos)
Zabezpieczony nagłówkiem `Authorization: Bearer ${CRON_SECRET}`. Jedno wywołanie = jedna paczka (`BATCH_SIZE`), nie jedna długa pętla:
1. RSS aktywnych kanałów → nowe filmy w statusie `discovered`.
2. YouTube Data API → długość; <20 min, Shorts, live/premiery → `skipped`; reszta → `queued`.
3. Paczka `queued` → `processing` → transkrypcja → AI (JSON) → zapis do `analyses` → `pending` (lub `published` przy `AUTO_PUBLISH=true`).
4. Błąd jednego filmu nie przerywa pętli: `attempts+1`, po 3 próbach `failed`, komunikat w `videos.error`.
Render Cron Job co 15–30 min woła ten endpoint.

## Kryteria oceny AI (rubric, sztywny)
1. Merytoryka 1–10 — gęstość konkretów (daty, liczby, traktaty, fakty vs ogólniki).
2. Clickbait: Niski/Średni/Wysoki — neutralny opis zgodności tytułu z treścią, bez oskarżeń.
3. TL;DR: 3–4 wnioski **własnymi słowami** (bez cytowania stenogramu — prawa autorskie).
4. Spis treści z minutami (timestampy muszą mieścić się w długości filmu — walidacja po odpowiedzi).
5. Gość + tagi tematyczne (#Bałtyk, #USA, #Chiny, #Ukraina, #Energetyka, #Wojsko, #Historia…).
Na stronie stała adnotacja: „Ocena wygenerowana automatycznie, może być korygowana przez redaktora".

## Dostęp i model subskrypcji
- Niezalogowany: ograniczony podgląd (3 najnowsze wywiady) + CTA „Zaloguj się przez Google lub Apple i testuj 30 dni za darmo (bez karty)".
- Pierwsze logowanie: trigger w Supabase tworzy `profiles` z `trial_ends_at = now() + 30 days`, `subscription_status='trialing'`.
- Zalogowany z aktywnym trialem/subskrypcją: 100% funkcji. Po wygaśnięciu: Paywall (15 zł/mies. lub 120 zł/rok).
- **Dostęp egzekwowany po stronie serwera przez RLS** (`has_access()`), nie tylko w UI.
- Apple Sign In (web): Services ID + klucz .p8. **Klucz kliencki (JWT) wygasa po max 6 miesiącach — odnawiać ręcznie, wpisać w kalendarz.**

## Panel admina (/admin)
Dodawanie kanałów (link/ID), lista pending/published, korekta ocen, komentarz redaktorski, ręczne uruchomienie sprawdzania. Dostęp: `profiles.is_admin = true`.

## Prawo / formalności (przed pierwszym płatnym użytkownikiem)
Regulamin, polityka prywatności (RODO), zgoda na natychmiastowe świadczenie treści cyfrowych (prawo odstąpienia 14 dni), procedura sprostowań, usuwanie konta. Wideo tylko linkujemy, bez kopiowania treści.

## Konwencje
- Env vars: patrz `.env.example`.
- Migracje SQL: `supabase/migrations/`.
- Kod pipeline: `src/lib/pipeline/`.

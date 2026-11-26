# Bez Szumu (bez-szumu.pl)

Polski serwis-kurator: automatycznie ocenia i rankinguje merytoryczne wywiady geopolityczne (wszystkie filmy z kanałów, min. 5 min, `MIN_DURATION_SECONDS=300` — odfiltrowuje Shorts i klipy) z wybranych polskich kanałów YouTube. Zamiast clickbaitów użytkownik dostaje ranking jakości, wnioski i znaczniki czasu.

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

## Publikacja i ryzyko prawne (ustalenia)
- `AUTO_PUBLISH=true`: ocenione filmy wchodzą na stronę same. **Wyjątek — wstrzymane do akceptacji redaktora (status `pending`)**: ocena AI < `REVIEW_BELOW_SCORE` (domyślnie 4) albo clickbait „Wysoki" (najbardziej wrażliwa etykieta przy nazwanym twórcy).
- Prompt (analyze.ts) wymusza neutralność: oceniamy materiał, nie osoby; zakaz ocen intencji/uczciwości (kłamstwo, manipulacja, dezinformacja…); cudze tezy relacjonujemy z przypisaniem.
- Wideo pokazujemy oficjalnym odtwarzaczem YouTube (youtube-nocookie embed), bez kopiowania miniatur. Transkrypcji nie publikujemy.
- Stopka: adnotacja o automatycznej, subiektywnej ocenie + link do zgłaszania sprostowań, jeśli ustawiono `NEXT_PUBLIC_CONTACT_EMAIL` (dodać w Render → Environment).
- DO ZROBIENIA przed płatnym startem: regulamin, polityka prywatności, procedura sprostowań, konsultacja z prawnikiem (prawo autorskie/media).

## Dostęp (zaimplementowane)
- Logowanie Google/Apple przez Supabase Auth (`/login`, `/auth/callback`, `/auth/signout`, `src/proxy.ts` odświeża sesję).
- Dostęp wyznacza serwer (`src/lib/session.ts`): gość i po wygaśnięciu triala widzą 3 najnowsze wywiady, trial (30 dni) i aktywna subskrypcja widzą wszystko. Po wygaśnięciu pokazuje się Paywall (przyciski płatności nieaktywne do czasu Stripe).
- Ranking czytany po stronie serwera pełną listą (klucz service role); do przeglądarki trafia tylko to, co użytkownik może zobaczyć. RLS w bazie nadal chroni bezpośrednie wywołania API.

- **Tymczasowo wszyscy (także niezalogowani) widzą wszystko** — `GUEST_FULL_ACCESS` (domyślnie włączone). Aby wprowadzić limit 3 filmów dla gości i paywall po triale: ustawić `GUEST_FULL_ACCESS=false` w Render → Environment.

## Dokumenty prawne i konto (zaimplementowane, szkice do weryfikacji przez prawnika)
- Strony `/regulamin` i `/polityka-prywatnosci` (treść w `src/app/regulamin`, `src/app/polityka-prywatnosci`), dane firmy i wersja w `src/lib/legal.ts` (`TERMS_VERSION`, `LEGAL_DRAFT`). Przy zmianie treści podnieść `TERMS_VERSION` — użytkownicy zaakceptują ponownie przy następnym logowaniu. `LEGAL_DRAFT` wyłączony na polecenie właściciela (2026-11-25); prawnik zweryfikuje dokumenty później — przy jego uwagach zmienić treść i podnieść `TERMS_VERSION`.
- Zgoda na /login (pole wyboru odblokowuje przyciski), ciasteczko `bs_terms`, zapis `profiles.terms_accepted_at/terms_version` w `/auth/callback` (migracja 0003). Bez zgody callback wylogowuje.
- `/konto`: status konta i trwałe usunięcie konta (`/konto/usun` -> `auth.admin.deleteUser`, profil usuwa się kaskadowo). Przy Stripe: przed usunięciem anulować subskrypcję.
- Zmienne firmowe: `NEXT_PUBLIC_COMPANY_NIP`, `NEXT_PUBLIC_COMPANY_KRS`, `NEXT_PUBLIC_CONTACT_EMAIL` (Render -> Environment).

## Apple Sign In — odnawianie sekretu (co 6 miesięcy!)
- Skonfigurowane 2026-11-25. Services ID: `pl.bezszumu.web`, Team ID: `C32DAM4ZU4`, Key ID: `DJZ7V872KQ`. Klucz `.p8` leży lokalnie w `secrets/AuthKey_DJZ7V872KQ.p8` (git go ignoruje; **zrobić kopię w menedżerze haseł** — Apple nie pozwala pobrać go ponownie).
- Sekret JWT w Supabase (Authentication → Providers → Apple → Secret Key) **wygasa 2027-05-27**. Odnowić najpóźniej ok. 2027-05-13:
  `node scripts/apple-secret.js secrets/AuthKey_DJZ7V872KQ.p8 C32DAM4ZU4 DJZ7V872KQ pl.bezszumu.web secrets/apple_client_secret.txt`
  następnie wkleić zawartość `secrets/apple_client_secret.txt` w Supabase i zapisać.

## Wymagane logowanie i kontrola liczby użytkowników
- `REQUIRE_LOGIN` (domyślnie włączone): niezalogowani widzą tylko stronę powitalną z przyciskiem logowania; ranking i /kanaly są dla zalogowanych. Wyłączenie: `REQUIRE_LOGIN=false`. Regulamin, Polityka prywatności i /login zawsze publiczne.
- `GUEST_FULL_ACCESS` (domyślnie włączone): zalogowani widzą wszystko także po zakończeniu triala; `=false` włącza Paywall po trialu i podgląd 3 filmów (po wdrożeniu Stripe).
- `MAX_USERS` (opcjonalne): limit miejsc w wersji próbnej; nowe konto ponad limit jest usuwane w `/auth/callback` (komunikat `/login?err=full`).
- `/admin`: sekcja „Użytkownicy" (zarejestrowani, w trialu, subskrypcja/admin, po trialu, nowi z 24 h/7 dni, lista ostatnich).

## Płatności i faktury (ustalone 2026-11-25, do wdrożenia)
- Stripe Checkout (Apple Pay / Google Pay / karta; najpierw tryb testowy) -> webhook -> `profiles.subscription_status`. Plany: 15 zł/mies., 120 zł/rok. Przy płatności: zgoda na natychmiastowe świadczenie (prawo odstąpienia 14 dni), zbieranie NIP i adresu (opcjonalnie).
- Faktury VAT: **Fakturownia przez API** (nie fakturowanie Stripe; KSeF). **Z NIP-em: automatycznie, wysyłka mailem przez Fakturownię.** Osoba prywatna: potwierdzenie ze Stripe + przycisk „Pobierz fakturę" w `/konto` (faktura na żądanie).
- Zmienne (ustawia użytkownik w Render → Environment): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, identyfikatory cen, `FAKTUROWNIA_ACCOUNT`, `FAKTUROWNIA_API_TOKEN`.
- Do potwierdzenia z księgową: faktury dla konsumentów tylko na żądanie?, kasa fiskalna/zwolnienie, VAT 23%/OSS, KSeF w Fakturowni.
- Przy usuwaniu konta z aktywną subskrypcją: najpierw anulować ją w Stripe.
- **Stripe wdrożony w kodzie (2026-11-26)**, bez SDK (REST w `src/lib/stripe.ts`): `/platnosc/checkout` (zgoda na natychmiastowe świadczenie wymagana, NIP opcjonalny, `withdrawal_consent_at`), `/api/stripe/webhook` (zdarzenia `checkout.session.completed`, `customer.subscription.created/updated/deleted` → `profiles`), `/konto/portal` (portal klienta), `/konto/usun` anuluje subskrypcję. Migracja `0005_stripe.sql`. Przyciski aktywne dopiero gdy ustawione `STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`. Fakturownia — następny krok.

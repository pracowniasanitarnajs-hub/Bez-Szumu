-- Comiesięczna ankieta: użytkownicy proponują nowe kanały YouTube i głosują (max 3 głosy na miesiąc na osobę).
-- Najpopularniejsze propozycje admin sprawdza i dodaje w /admin. Dostęp wyłącznie przez serwer (service role).
create table if not exists public.channel_suggestions (
  id uuid primary key default gen_random_uuid(),
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  name text not null check (char_length(name) between 2 and 80),
  name_key text not null,
  url text check (url is null or char_length(url) <= 300),
  status text not null default 'open' check (status in ('open', 'added', 'rejected')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (month, name_key)
);

create table if not exists public.channel_suggestion_votes (
  suggestion_id uuid not null references public.channel_suggestions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null,
  created_at timestamptz not null default now(),
  primary key (suggestion_id, user_id)
);
create index if not exists channel_suggestion_votes_user_month_idx on public.channel_suggestion_votes (user_id, month);

alter table public.channel_suggestions enable row level security;
alter table public.channel_suggestion_votes enable row level security;
-- Brak polityk: przeglądarka nie ma bezpośredniego dostępu, wszystko idzie przez akcje serwera.

-- Codzienne posty w mediach społecznościowych (na razie Facebook): szkic -> akceptacja w /admin -> publikacja.
create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'facebook',
  day date not null,                -- dzień, którego dotyczy ranking (wczoraj względem publikacji)
  message text not null,
  link text,
  status text not null default 'draft' check (status in ('draft','published','skipped','failed')),
  external_id text,                 -- id posta na Facebooku
  error text,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (platform, day)
);

-- Tylko serwer (service role); bez polityk = brak dostępu z przeglądarki.
alter table public.social_posts enable row level security;

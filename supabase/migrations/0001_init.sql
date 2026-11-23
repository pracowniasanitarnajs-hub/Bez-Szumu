-- Bez Szumu: schemat początkowy.

-- ===== PROFILE I DOSTĘP =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  trial_ends_at timestamptz not null default (now() + interval '30 days'),
  subscription_status text not null default 'trialing'
    check (subscription_status in ('trialing','active','past_due','canceled','expired')),
  subscription_source text check (subscription_source in ('stripe','revenuecat','manual')),
  current_period_end timestamptz,
  stripe_customer_id text unique,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Trigger: nowy użytkownik OAuth (Google/Apple) -> profil z 30 dniami triala.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, trial_ends_at, subscription_status)
  values (new.id, new.email, now() + interval '30 days', 'trialing')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Czy aktualny użytkownik ma pełny dostęp (trial / aktywna subskrypcja / admin).
create or replace function public.has_access()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        p.is_admin
        or p.subscription_status = 'active'
        or (p.subscription_status = 'trialing' and p.trial_ends_at > now())
      )
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ===== KANAŁY I FILMY =====
create table public.channels (
  id uuid primary key default gen_random_uuid(),
  youtube_channel_id text not null unique,
  name text not null,
  handle text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  youtube_video_id text not null unique,
  title text not null,
  published_at timestamptz not null,
  thumbnail_url text,
  duration_seconds integer,
  status text not null default 'discovered'
    check (status in ('discovered','skipped','queued','processing','pending','published','failed')),
  attempts integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index videos_status_idx on public.videos (status);
create index videos_published_idx on public.videos (published_at desc);

-- ===== ANALIZY AI =====
create table public.analyses (
  video_id uuid primary key references public.videos(id) on delete cascade,
  ai_score numeric(3,1) not null check (ai_score between 1 and 10),
  editor_score numeric(3,1) check (editor_score between 1 and 10),
  clickbait_level text not null check (clickbait_level in ('Niski','Średni','Wysoki')),
  clickbait_note text,
  summary text[] not null default '{}',
  timestamps jsonb not null default '[]',   -- [{ "t": 754, "label": "..." }]
  guest text,
  tags text[] not null default '{}',
  editor_comment text,
  model text,
  created_at timestamptz not null default now()
);
create index analyses_tags_idx on public.analyses using gin (tags);

-- ===== RLS =====
alter table public.profiles enable row level security;
alter table public.channels enable row level security;
alter table public.videos enable row level security;
alter table public.analyses enable row level security;

-- profiles: użytkownik widzi tylko swój profil (zapisy tylko przez service role / webhook).
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- channels: czytają wszyscy, zarządza admin.
create policy "channels_select_all" on public.channels for select using (true);
create policy "channels_admin_write" on public.channels
  for all using (public.is_admin()) with check (public.is_admin());

-- videos: opublikowane widzi każdy (karta skrócona), admin widzi i zmienia wszystko.
create policy "videos_select_published" on public.videos
  for select using (status = 'published' or public.is_admin());
create policy "videos_admin_write" on public.videos
  for all using (public.is_admin()) with check (public.is_admin());

-- analyses: pełna treść dla osób z dostępem; dla gości tylko 3 najnowsze opublikowane.
create policy "analyses_select_access" on public.analyses
  for select using (
    public.is_admin()
    or (
      exists (select 1 from public.videos v where v.id = video_id and v.status = 'published')
      and (
        public.has_access()
        or video_id in (
          select id from public.videos
          where status = 'published'
          order by published_at desc
          limit 3
        )
      )
    )
  );
create policy "analyses_admin_write" on public.analyses
  for all using (public.is_admin()) with check (public.is_admin());

-- Cron używa klucza service role, który omija RLS.

-- ===== UPRAWNIENIA API (jawne, działają niezależnie od opcji "grant automatically") =====
grant usage on schema public to anon, authenticated;
grant select on public.channels, public.videos, public.analyses to anon, authenticated;
grant select on public.profiles to authenticated;
grant insert, update, delete on public.channels, public.videos, public.analyses to authenticated; -- RLS: tylko admin
grant execute on function public.has_access(), public.is_admin() to anon, authenticated;

-- ===== DANE STARTOWE =====
-- Historia Realna: uzupełnij youtube_channel_id (UC...) w panelu admina lub tutaj.
-- insert into public.channels (youtube_channel_id, name, handle) values ('UC_TODO', 'Historia Realna', '@HistoriaRealna');

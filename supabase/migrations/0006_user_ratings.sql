-- Oceny filmów wystawiane przez zalogowanych użytkowników (1–10, jedna ocena na film na osobę).
create table if not exists public.user_ratings (
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score smallint not null check (score between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (video_id, user_id)
);
create index if not exists user_ratings_video_idx on public.user_ratings (video_id);

alter table public.user_ratings enable row level security;

-- Użytkownik widzi i zmienia tylko własne oceny. Średnie liczy serwer (service role).
create policy "user_ratings_own_select" on public.user_ratings for select using (user_id = auth.uid());
create policy "user_ratings_own_insert" on public.user_ratings for insert with check (user_id = auth.uid());
create policy "user_ratings_own_update" on public.user_ratings for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_ratings_own_delete" on public.user_ratings for delete using (user_id = auth.uid());

grant select, insert, update, delete on public.user_ratings to authenticated;

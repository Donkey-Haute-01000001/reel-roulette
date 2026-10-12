-- ============================================================================
-- One-off update: add the watched_movies table ("Seen It") to an existing
-- database. (Fresh setups get this from schema.sql instead.) Safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- watched_movies: pictures a visitor has actually watched ("Seen It"). Not
-- the same as seen_movies (swipe-left discards): a plain toggle the visitor
-- sets and unsets, which changes what a swipe means for that picture (right
-- = see it again, left = once was enough).
-- ---------------------------------------------------------------------------
create table if not exists public.watched_movies (
  session_id text not null,
  movie_id   bigint not null references public.movies (id) on delete cascade,
  watched_at timestamptz not null default now(),
  primary key (session_id, movie_id)
);

alter table public.watched_movies enable row level security;

-- Same open demo access model as the watchlist (no auth system here).
drop policy if exists "public read" on public.watched_movies;
create policy "public read" on public.watched_movies for select using (true);

drop policy if exists "public insert" on public.watched_movies;
create policy "public insert" on public.watched_movies for insert with check (true);

drop policy if exists "public delete" on public.watched_movies;
create policy "public delete" on public.watched_movies for delete using (true);

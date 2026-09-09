-- ============================================================================
-- Movie Roulette — Supabase schema
-- A relational model for a swipeable movie-recommendation roulette:
-- movies, their genres (many-to-many), and a lightweight session-based
-- watchlist (no login system — each browser gets a random id in
-- localStorage, so this is a public demo, not a production auth model).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- genres: the fixed set of genre tags used for both filtering and the
-- color-coded accent badges on each movie card
-- ---------------------------------------------------------------------------
create table if not exists public.genres (
  slug  text primary key,
  name  text not null unique
);

comment on table public.genres is 'Fixed genre vocabulary; slug doubles as the key into the UI''s genre color map.';

-- ---------------------------------------------------------------------------
-- movies: the roulette pool
-- ---------------------------------------------------------------------------
create table if not exists public.movies (
  id              bigint primary key generated always as identity,
  title           text not null,
  release_year    smallint not null check (release_year between 1900 and 2100),
  director        text not null,
  runtime_minutes smallint not null check (runtime_minutes > 0),
  rating          numeric(3,1) not null check (rating between 0 and 10),
  primary_genre   text not null references public.genres (slug),
  mood_tags       text[] not null default '{}',
  synopsis        text not null,
  created_at      timestamptz not null default now()
);

comment on table public.movies is 'The pool of movies the roulette deck draws from.';

create index if not exists movies_primary_genre_idx on public.movies (primary_genre);
create index if not exists movies_release_year_idx on public.movies (release_year);
create index if not exists movies_mood_tags_idx on public.movies using gin (mood_tags);

-- ---------------------------------------------------------------------------
-- movie_genres: many-to-many — a movie usually carries 2-3 genre tags,
-- even though only one drives its card's accent color (primary_genre)
-- ---------------------------------------------------------------------------
create table if not exists public.movie_genres (
  movie_id   bigint not null references public.movies (id) on delete cascade,
  genre_slug text not null references public.genres (slug) on delete cascade,
  primary key (movie_id, genre_slug)
);

create index if not exists movie_genres_genre_idx on public.movie_genres (genre_slug);

-- ---------------------------------------------------------------------------
-- watchlist: movies a visitor swiped right on, keyed by a random
-- client-generated session id (no accounts) — see src/lib/session.ts
-- ---------------------------------------------------------------------------
create table if not exists public.watchlist (
  id         bigint primary key generated always as identity,
  session_id text not null,
  movie_id   bigint not null references public.movies (id) on delete cascade,
  saved_at   timestamptz not null default now(),
  unique (session_id, movie_id)
);

create index if not exists watchlist_session_idx on public.watchlist (session_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.genres      enable row level security;
alter table public.movies      enable row level security;
alter table public.movie_genres enable row level security;
alter table public.watchlist   enable row level security;

drop policy if exists "public read" on public.genres;
create policy "public read" on public.genres for select using (true);

drop policy if exists "public read" on public.movies;
create policy "public read" on public.movies for select using (true);

drop policy if exists "public read" on public.movie_genres;
create policy "public read" on public.movie_genres for select using (true);

-- No auth system here — this is a class demo, so the watchlist is openly
-- readable/writable by the anon key rather than scoped to a verified user.
drop policy if exists "public read" on public.watchlist;
create policy "public read" on public.watchlist for select using (true);

drop policy if exists "public insert" on public.watchlist;
create policy "public insert" on public.watchlist for insert with check (true);

drop policy if exists "public delete" on public.watchlist;
create policy "public delete" on public.watchlist for delete using (true);

-- ---------------------------------------------------------------------------
-- Convenience view: movies joined with their full genre tag list
-- ---------------------------------------------------------------------------
create or replace view public.movies_with_genres as
select
  m.*,
  coalesce(
    array_agg(mg.genre_slug order by mg.genre_slug) filter (where mg.genre_slug is not null),
    '{}'
  ) as genre_slugs
from public.movies m
left join public.movie_genres mg on mg.movie_id = m.id
group by m.id;

# Reel Roulette

A Victorian picture-show lottery for deciding what to watch. Every movie is a playing card:
swipe through the deck, keep the ones that take your fancy in your Watch Deck, play your hand
on a casino table, or leave it to the slot machine. Built for a class assignment covering
Vercel, shadcn/ui, and Supabase.

**Note on artwork:** there's no scraped/licensed poster art here — real movie posters are
copyrighted studio assets. Every card is drawn from scratch in CSS/SVG instead, after an old
(c. 1930) playing-card deck: the movie's genre is its suit, and its rating sets its rank. Movie
facts (title, year, director, runtime) are just facts; the one-paragraph blurbs are written from
scratch.

## The three tabs

- **Swipe** (`/`) — swipe right to keep a card (it goes to your Watch Deck), left to discard it
  if it doesn't interest you or you've seen it. Cards fly onto Keep and Discard piles beside the
  deck. Kept and discarded movies are never dealt again; *Shuffle Discards Back In* returns the
  discards. Filter by genre.
- **Watch Deck** (`/watchlist`) — your kept cards as a card-game hand (Hearthstone-style: hover
  to lift, click or drag a card up to play it). Played cards land on a green-baize casino table
  with their details. *Deal* (the deck on the felt) deals a random card from your hand; *Hit Me*
  deals one you haven't kept yet, fresh from the house. `?play=<movieId>` opens with that card
  already on the table.
- **Spin** (`/roulette`) — a three-reel slot machine drawing from your Watch Deck or the whole
  catalogue, three spins a day. The winning movie is picked before the reels move, and every
  reel is built to stop on it. Adding the result to your deck takes you to it on the table.

Stage curtains frame every page; pull a curtain's tassel to move to the neighbouring tab.

### Card ranks

A card's rank comes from the movie's rating alone, on fixed half-point bands centred on the
typical film rating (~6.3), so a large catalogue forms a bell curve across the deck: A = 9.0+,
K = 8.5+, Q = 8.0+, J = 7.5+, 10 = 7.0+, 9 = 6.5+, 8 = 6.0+, down to 2 below 3.5. See
`src/lib/card-rank.ts`.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, TypeScript, Turbopack)
- [Tailwind CSS v4](https://tailwindcss.com), with Google Fonts woodtype faces (Abril Fatface,
  Rye, Holtwood One SC, Old Standard TT)
- shadcn/ui-style components (Button, Badge, Select, Dialog, …) built on Radix UI primitives
- [Supabase](https://supabase.com) (Postgres + `@supabase/supabase-js`) for the movie dataset,
  Watch Deck, discards, and the daily spin count
- [Motion](https://motion.dev) for the swipe physics, the hand, dealing, and the slot reels

## Project structure

```
src/app/                    Route pages: / (Swipe), /watchlist (Watch Deck), /roulette (Spin)
src/components/ui/          shadcn-style UI primitives
src/components/             Screens, swipe deck, Watch Deck hand + casino table, slot machine,
                            movie card + card back, broadside banners, stage curtains, nav/footer
src/lib/                    Supabase client and data layer, per-feature clients (watchlist,
                            discards, spins), card ranks, filters, tabs, session id, genre metadata
supabase/schema.sql         Tables (movies, genres, movie_genres, watchlist, seen_movies,
                            roulette_spins), RLS policies, a joined view
supabase/seed.sql           Generated seed data (68 movies across 10 genres)
scripts/gen_seed.py         Source of truth for the dataset — regenerate with
                            `python3 scripts/gen_seed.py > supabase/seed.sql`
```

## How identity works

There's no login system. Each browser gets a random id (`crypto.randomUUID()`) stored in
`localStorage` the first time it loads the app (see `src/lib/session.ts`), and that id tags the
rows a visitor writes: their Watch Deck (`watchlist`), their discards (`seen_movies`), and their
daily spin count (`roulette_spins`, kept server-side so the 3-a-day limit survives clearing the
page). It's enough identity to survive a refresh without building a whole auth system — good
enough for a class demo, not meant to be secure multi-user storage.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Supabase project, then in the SQL editor run `supabase/schema.sql` followed by
   `supabase/seed.sql`.

3. Copy `.env.local.example` to `.env.local` and fill in your project's URL and publishable
   (anon) key (Project Settings → API Keys / Data API). Never use the secret key here.

   ```bash
   cp .env.local.example .env.local
   ```

4. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

Without Supabase configured, the app still builds and renders — pages show an empty state instead
of erroring, so `npm run build` works even before the database is wired up.

## Deploying

Push to GitHub, then import the repository in Vercel. Add `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables in the Vercel project settings and deploy.

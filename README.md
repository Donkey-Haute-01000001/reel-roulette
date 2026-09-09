# Reel Roulette

Can't decide what to watch? Swipe through a roulette of movies — swipe right to save a pick to
your watchlist, swipe left (or hit reroll) to spin again. Built for a class assignment covering
Vercel, shadcn/ui, and Supabase.

**Note on artwork:** there's no scraped/licensed poster art here — real movie posters are
copyrighted studio assets. Every card instead gets an original, generated "lobby card" look: a
genre-tinted gradient with a large watermark icon, built from CSS. Movie facts (title, year,
director, runtime) are just facts; the one-paragraph blurbs are written from scratch.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, TypeScript, Turbopack)
- [Tailwind CSS v4](https://tailwindcss.com)
- shadcn/ui-style components (Button, Card, Badge, Select, Dialog, Separator) built on Radix UI primitives
- [Supabase](https://supabase.com) (Postgres + `@supabase/supabase-js`) for the movie dataset and watchlist
- [Motion](https://motion.dev) for the drag/swipe card physics

## Project structure

```
src/app/                   Route pages: / (roulette deck), /watchlist
src/components/ui/          shadcn-style UI primitives
src/components/             Roulette screen, swipe deck, movie card, poster art, nav/footer
src/lib/                     Supabase client, typed data layer, session id helper, genre metadata
supabase/schema.sql          Tables (movies, genres, movie_genres, watchlist), RLS policies, a joined view
supabase/seed.sql            Generated seed data (68 movies across 10 genres)
scripts/gen_seed.py          Source of truth for the dataset — regenerate with `python3 scripts/gen_seed.py > supabase/seed.sql`
```

## How the watchlist works

There's no login system. Each browser gets a random id (`crypto.randomUUID()`) stored in
`localStorage` the first time it loads the app (see `src/lib/session.ts`), and that id tags every
row a visitor saves to `watchlist`. It's enough identity to survive a page refresh without
building a whole auth system — good enough for a class demo, not meant to be secure multi-user
storage.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Supabase project, then in the SQL editor run `supabase/schema.sql` followed by
   `supabase/seed.sql`.

3. Copy `.env.local.example` to `.env.local` and fill in your project's URL and anon key
   (Project Settings → API):

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

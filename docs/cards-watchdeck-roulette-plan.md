# Reel Roulette: playing-card UI, Watch Deck, and the Roulette slot machine

## Context

This builds on top of the already-fixed swipe deck (see `docs/swipe-fix-plan.md`
in the repo for that earlier work). The ask now is a bigger visual/feature
pass across the app, scoped through a long back-and-forth with the user:

1. Make the movie cards actually read as playing cards (genre as a "suit"
   icon, no rank for now, room for a future rating-as-rank).
2. Rename "Watchlist" to "Watch Deck" and give it a fanned "hand of cards"
   browsing experience instead of a plain grid.
3. Add "Hit Me" — an unlimited random pull from your Watch Deck.
4. Add "Pick a Card" — a criteria-filtered random pull from your Watch Deck.
5. Add "Roulette" — a slot machine (not a wheel — the three spinning
   columns play on "Reel" in "Reel Roulette") that draws from either your
   Watch Deck or the whole catalog, filtered by the same genre/mood/runtime
   criteria used everywhere else, capped at 3 spins/day (tracked server-side
   so it survives clearing local storage).

Every decision below reflects an explicit answer the user gave when asked,
not an assumption — see the per-section notes for which choice was picked
and why.

## 1. Shared groundwork

- **Extract `shuffle<T>()`** out of `src/components/swipe-deck.tsx` into
  `src/lib/utils.ts` (it already has `cn()` as the one shared helper). Both
  the Watch Deck random draws and the Roulette target-pick need unbiased
  shuffling, so this stops it from being duplicated a third time.
- **Suit system — confirmed: 10 unique suits, not the traditional 4.** Each
  genre already has its own icon + color in `GENRE_META`
  (`src/lib/genre-meta.ts`) — reuse that directly as the "suit" rather than
  inventing a new 4-suit mapping. No new data needed here.
- **No rank for now.** Leave a reserved corner slot in the new card layout
  (visually) where a rating-as-rank could go later — don't wire up logic for
  it yet, just don't design the corner so it's awkward to add.

## 2. Card redesign (shared between swipe deck and Watch Deck)

Rework `src/components/movie-card.tsx` (and however `src/components/movie-poster.tsx`
needs to adapt) into a genuine playing-card frame:

- Corner "suit" pips: the movie's primary genre icon (from `GENRE_META`),
  top-left and mirrored bottom-right, same as a real card's corner rank+suit
  block — just suit only, no rank glyph.
- Keep the existing generated "lobby card" poster art, genre accent color,
  synopsis, mood tags, director/runtime — just reflow around the card-frame
  treatment (rounded corners, border, corner pips) rather than the current
  plain rounded rectangle.
- This component is shared — both `swipe-deck.tsx`'s `SwipeCard` and the new
  Watch Deck fan use it, so the redesign automatically applies everywhere.

## 3. Watch Deck (renamed from Watchlist)

**Rename everywhere:** nav label in `src/components/site-nav.tsx`
(`"Watchlist"` → `"Watch Deck"`), page heading/copy in
`src/app/watchlist/page.tsx` ("Everything you've saved" copy, empty-state
text), and the "Connect Supabase" / empty-state messaging. Route path itself
(`/watchlist`) can stay as-is — only user-facing labels need to change.

**Default view: fanned hand of cards** (confirmed — toggle to grid, not a
replacement):

- Cards arranged in an arc, overlapping like a hand of cards, increasing
  rotation toward the ends, the focused card lifted slightly forward/enlarged.
- Drag left/right (mouse or touch) to flip through — each drag gesture
  advances exactly one card at a time (snap to the next/previous card), not
  a free scroll — so it always settles on one focused card. Reuse Motion's
  drag primitives the same way `swipe-deck.tsx` already does (`useMotionValue`,
  `onDragEnd` with a threshold), just for fan-navigation instead of
  swipe-to-decide.
- A small toggle (e.g. a segmented control or icon button) switches to the
  existing grid layout — keep that grid code largely as-is, just re-skinned
  with the new card component from §2.

**Hit Me button:** pulls one random entry from the Watch Deck's current
movie list via the shared `shuffle()` util, no criteria, no limit — just
reveals/focuses that card in the fan view.

**Pick a Card:** same idea as Hit Me, but gated behind a filter row (genre
multi-select, mood, max runtime — the exact same filter UI/logic already in
`src/components/roulette-screen.tsx`'s `filtered` useMemo, just applied to
the Watch Deck's entries instead of the full catalog) before drawing
randomly from whatever matches. No daily limit (confirmed).

## 4. Roulette (new slot machine)

Lives in its own section on the Watch Deck page (confirmed: "next to the
watch deck", not a separate nav item).

**Pool + filters (confirmed):** a "Spin for:" toggle choosing the source
pool — *Watch Deck* or *whole catalog* — plus the same genre/mood/runtime
filter row as everywhere else, applied on top of whichever pool is chosen.
Genre selection is multi-select and OR'd, matching the existing
`roulette-screen.tsx` filter semantics exactly (picking Action + Romance
means "has either tag", not "has both"). Spin is disabled with an inline
reason when the filtered pool is empty.

**Mechanics (confirmed — slot machine over wheel, reels = movies not
abstract symbols):**

- On "Spin": first check remaining spins (see below); if allowed, pick the
  **target movie** immediately via `shuffle()` over the filtered pool —
  decided before any animation starts, same "decide first, animate after"
  principle used in the swipe-deck fix.
- Three reels, each a tall vertical strip of mini movie-poster thumbnails
  (reuse `MoviePoster` at a small size) built from the filtered pool,
  shuffled independently per reel, repeated enough times to give a long
  scroll distance, with the target movie spliced into each strip at a
  precomputed stop offset so all three land on the same poster.
- Animate each reel's vertical offset to its stop position (Motion
  `animate()`/`useAnimationControls`, easeOut deceleration). Stagger the
  stops — left reel first, then middle, then right, ~300–400ms apart — for
  the classic clunk-clunk-clunk.
- Once all three have landed, reveal the full card (§2's card component) for
  the target movie below the machine — reveal only, nothing is auto-saved to
  the Watch Deck (confirmed). The user can manually save it from there the
  same way swiping right does elsewhere, if there's already a "save" action
  exposed on a standalone card view — otherwise a simple save button next to
  the reveal is enough.

**Daily limit — confirmed server-side, keyed to session_id:**

- New table in `supabase/schema.sql`:

  ```sql
  create table if not exists public.roulette_spins (
    session_id text not null,
    spin_date  date not null default current_date,
    spin_count smallint not null default 0,
    primary key (session_id, spin_date)
  );

  alter table public.roulette_spins enable row level security;
  create policy "public read" on public.roulette_spins for select using (true);
  create policy "public upsert" on public.roulette_spins for insert with check (true);
  create policy "public update" on public.roulette_spins for update using (true);
  ```

  Follows the same open/permissive RLS pattern already used for `watchlist`
  (no auth system in this app — consistent, not a new access model).
- New client functions in a `src/lib/roulette-client.ts` (mirrors the shape
  of `src/lib/watchlist-client.ts`): `getSpinsRemaining()` (reads today's
  row for `getSessionId()`, returns `3 - spin_count`, defaulting to 3 when no
  row exists yet) and `recordSpin()` (upsert-increment `spin_count` for
  today's row). Plain read-then-write client-side, matching the existing
  pattern in this codebase — no Postgres RPC needed for a class-scale demo.
- UI shows "X spins left today" next to the Spin button/lever, and disables
  it with "Come back tomorrow" once it hits 0.

## Files to touch

- `src/lib/utils.ts` — add shared `shuffle()`.
- `src/lib/genre-meta.ts` — unchanged (already has what's needed per-genre).
- `src/components/movie-card.tsx`, `src/components/movie-poster.tsx` — card
  frame redesign (§2).
- `src/components/swipe-deck.tsx` — update `shuffle` import, nothing else
  forced by this change (still uses the redesigned `MovieCard` for free).
- `src/components/site-nav.tsx` — label rename.
- `src/app/watchlist/page.tsx` — rename copy; add fan/grid toggle; host the
  new Roulette section alongside the Watch Deck.
- New: a fan/hand-of-cards component (e.g. `src/components/watch-deck-fan.tsx`),
  a Hit Me / Pick a Card control (could live in the same file or split out),
  and a slot-machine component (e.g. `src/components/roulette-slot.tsx`).
- New: `src/lib/roulette-client.ts`.
- `supabase/schema.sql` — add the `roulette_spins` table + policies (append;
  don't restructure the existing tables).

## Verification

1. `npm run dev`, confirm no type errors (`tsc --noEmit` or the build
   script) after all the above.
2. Visual: swipe-deck cards and Watch Deck cards both show the new
   playing-card frame with correct genre suit pips.
3. Watch Deck: confirm default fan view, drag-to-flip settles one card at a
   time on both mouse and a touch-emulated viewport; toggle to grid works.
4. Hit Me / Pick a Card: draw from Watch Deck only, Pick a Card respects
   filters, neither is rate-limited.
5. Roulette: spin with a few different pool/filter combinations (Watch
   Deck-only, whole catalog, multi-genre OR), confirm all three reels land
   on the same movie as the pre-selected target every time (not just most of
   the time — this must be deterministic, not lucky). Spin 3 times, confirm
   the button disables and shows "come back tomorrow" on the 4th attempt;
   confirm the count is read back correctly after a page reload (proves it's
   server-side, not just in-memory).
6. Check Supabase directly (table editor) to confirm `roulette_spins` rows
   are being written with the right `session_id`/`spin_date`/`spin_count`.

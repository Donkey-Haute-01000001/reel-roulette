# Reel Roulette: Spin — toggle to exclude "Seen It" movies from the Watch Deck pool

## Context

The user wants a way to skip movies they've already marked "Seen It"
(watched) when spinning from their Watch Deck. Worth noting up front: this
codebase has two unrelated "seen" concepts — `seen_movies` (the swipe
deck's discard pile, movies swiped left on) and `watched_movies` (the
actual "Seen It" toggle, dog-eared corner). Confirmed with the user this
is about the second one — "Seen It"/watched — not the discard pile. The
discard pile is already excluded from the whole-catalog Spin pool
automatically and wouldn't normally overlap with the Watch Deck anyway (a
saved movie was never swiped left), so there was nothing to add there.

## Diagnosis

Confirmed via reading `roulette-slot.tsx`, `roulette-screen.tsx`, and
`movie-filters.ts`:

- The candidate pool is built in `roulette-slot.tsx` (~line 130-132):
  ```js
  const pool = source === "deck" ? deckMovies : catalog;
  const filtered = React.useMemo(() => applyFilters(pool, filters), [pool, filters]);
  ```
  `filtered` feeds everything downstream — the preview strips, the actual
  spin target (`shuffle(filtered)[0]`), and the reel strips. There's
  currently no watched-status filtering anywhere in this pipeline, only
  genre filtering via `applyFilters`.
- `watchedIds` is already passed into `roulette-slot.tsx` as a prop and
  used for display (the dog-ear state, the result dialog's "Seen It"
  button) — it's already in scope, just never used for pool filtering.
- `movie-filters.ts`'s `FilterState`/`applyFilters` is genre-only and
  shared with the home swipe deck. Extending it to understand
  watched-status would couple the swipe deck's filtering to this too,
  which isn't wanted — the swipe deck should keep showing watched movies
  during discovery regardless of this toggle. This needs to be a
  Spin-local filter step, not a change to the shared utility.
- The pool selector ("Your Watch Deck" / "The Whole Catalogue") is a
  `role="radiogroup"` of `PoolTicket` buttons (~lines 277-293), with the
  genre `FilterBar` rendered just below it (~lines 296-302).

## Fix

Add a local toggle in `roulette-slot.tsx`, shown only when `source ===
"deck"` (per the user's request — this is about the Watch Deck pool
specifically, not the whole catalog):

1. New local state: `const [excludeWatched, setExcludeWatched] =
   React.useState(false);` — defaults to off, so default behavior is
   unchanged (includes everything, same as today).
2. Extend the `filtered` computation to apply this as a second,
   Spin-local filter step after the existing genre filter, only when
   spinning from the deck:
   ```js
   const filtered = React.useMemo(() => {
     const base = applyFilters(pool, filters);
     return source === "deck" && excludeWatched
       ? base.filter((m) => !watchedIds.has(m.id))
       : base;
   }, [pool, filters, source, excludeWatched, watchedIds]);
   ```
3. Add a checkbox/toggle control near the pool selector — something like
   "Skip movies I've already seen" — visible only when `source ===
   "deck"` (it has no meaning for the whole catalog pool as scoped here).
   Follow the existing `HelpTip` pattern already used elsewhere on this
   screen for a short explainer tooltip next to it, consistent with how
   other Spin controls are annotated.
4. Verify what happens if this empties the pool entirely (e.g. every
   saved movie has been marked watched) — there should already be
   handling for an empty `filtered` pool from genre filters alone; confirm
   the same empty-state UI covers this case too rather than silently
   breaking the spin.

Out of scope for this pass, per the user's own phrasing: applying this
same toggle to the whole-catalog pool. Cheap to add later if wanted —
same filter step, just drop the `source === "deck"` condition — but not
part of this request.

## Files to touch

- `src/components/roulette-slot.tsx` — new `excludeWatched` state, the
  extended `filtered` computation, and the new toggle control + help tip
  near the pool selector.

## Verification

1. With the pool set to "Your Watch Deck" and the toggle off (default):
   confirm spins can still land on a movie you've marked "Seen It" — no
   change from current behavior.
2. Turn the toggle on: confirm spins only ever land on unwatched Watch
   Deck movies, and the preview strips/reel contents update accordingly.
3. Mark every movie in a small Watch Deck as "Seen It," then turn the
   toggle on: confirm the app handles an empty pool gracefully (same
   empty-state behavior as an over-narrow genre filter) rather than
   erroring.
4. Switch the pool selector to "The Whole Catalogue": confirm the toggle
   disappears (or has no effect) there, since this pass is scoped to the
   Watch Deck pool only.

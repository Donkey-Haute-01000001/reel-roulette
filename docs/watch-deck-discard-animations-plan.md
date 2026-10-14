# Reel Roulette: Watch Deck table discard — animations + discard memory

## Status

**Complete (2026-10-14).** Built in `ecf7070` plus a follow-up burn rework.
Changes from the plan as written:
- Discard joins the existing discard pile (`seen_movies`, via `markSeen`) and
  Hit Me now skips the whole pile, swiped-left cards included. The plan
  assumed Hit Me already did; it didn't.
- The state change happens on click and the exit animation plays as the
  card leaves (AnimatePresence `custom` + `popLayout`), so no ref guard or
  on-complete callback is needed.
- Back to Hand also got an exit (drops back down into the hand), and a
  replaced card fades out.
- Strike from Deck's burn is modelled on a reference clip the user supplied:
  a burn line climbs bottom-to-top with a scorched glowing band above it,
  throwing off petal flame flakes and smoke, about 1.2s. An instant
  snap-to-black was tried and dropped.


Earlier research (while scaffolding `docs/layout-responsive-plan.md`) turned up
that the Watch Deck table card has two different removal buttons that behave
very differently under the hood, and neither one has any exit animation —
the card just instantly unmounts. Discussed both problems with the user and
settled on fixes for each:

1. **"Strike from Deck"** (a card you'd already saved) really deletes the
   movie from your Watch Deck in Supabase, permanently. Since it's a true
   destructive action, it gets a burn-to-ash/dematerialize animation.
2. **"Discard"** (a Hit Me card you never saved) currently does nothing but
   clear the table — no record is kept, so the same movie can resurface on
   your very next Hit Me pull. The user decided this should behave like a
   home-screen left-swipe: remembered, so it won't come back. It gets its
   own, lighter exit animation (flip face-down and slide off), distinct
   from the burn effect, so "destroyed forever" and "rejected, won't
   resurface" read as different things.

## 1. Strike from Deck — burn/dematerialize exit animation

**Current state:** in `watch-deck-screen.tsx`, `handleRemove(movieId)` calls
`clearTable()` (sets `table` to `null`) and then deletes the row from
Supabase via `removeFromWatchlist(movieId)` (`src/lib/watchlist-client.ts`).
The table card is rendered as a plain ternary — not wrapped in
`AnimatePresence` — so there is no exit transition; the card just unmounts
instantly the moment `table` becomes `null`.

**Fix:** wrap the table-card render in `AnimatePresence` and give it an
`exit` animation that reads as burning away rather than just moving:

- Char/darken the card face first (a dark overlay or a desaturate+darken
  filter transition over the card art).
- Spawn a handful of small ember/ash particle elements (plain
  `motion.div`/`motion.span`, no canvas or WebGL needed — Motion is already
  used elsewhere in this app) that drift upward with a little horizontal
  drift and fade out, starting as the char begins.
- Fade the card itself out last, after the char/ember beat starts, so the
  particles read as coming off the card rather than everything fading at
  once.
- The real state change (`clearTable()` + the Supabase delete) should run
  once the exit animation completes, guarded by the same `useRef`
  re-entrancy pattern already used to fix the swipe-deck's double-count bug
  (`docs/feedback-round-1-plan.md` §1) — `AnimatePresence` exit callbacks
  can re-fire on a frozen instance, so the removal logic needs a ref guard,
  not a state-based one, to avoid double-firing.

## 2. Discard (Hit Me, unsaved card) — behavior change + new animation

**Current state:** the "Discard" button (shown when the Hit Me card was
never saved, i.e. `!inDeck`) calls `clearTable()` directly — no
`markSeen()` call, no write of any kind. Because of that, the catalog pool
(`housePool`) only excludes already-saved movies and whatever's currently
on the table, so a discarded Hit Me movie can resurface on a later pull.
The home swipe deck's left-swipe already solves this exact problem by
calling `markSeen(current.id)` (`src/lib/seen-client.ts`).

**Fix — behavior:** add a `markSeen(movieId)` call alongside the existing
`clearTable()` in the Discard handler — the same helper the swipe deck
already uses, so a discarded Hit Me movie is remembered and excluded from
future Hit Me pulls (and anywhere else `seen_movies` already filters the
catalog), matching the swipe deck's left-swipe semantics exactly. This is a
small addition reusing an existing client helper; no new table or schema
change needed.

**Fix — animation:** give Discard a distinct, lighter exit animation, not
the burn effect. The table card already animates in with a spring + 3D
flip (`DEAL_FROM`) when Hit Me deals it. Reverse that same flip: animate
the card flipping face-down and sliding off the near edge of the table,
reusing the existing flip/spring motion values rather than introducing new
animation primitives. As with Strike from Deck, the real state change
(`markSeen()` + `clearTable()`) should run once this exit animation
completes, using the same ref-guarded completion pattern.

## Files to touch

- `src/components/watch-deck-screen.tsx` — wrap the table-card render in
  `AnimatePresence`; add the two distinct `exit` animations (burn/ash for
  Strike from Deck, flip-and-slide for Discard); add `markSeen(movieId)` to
  the Discard path; guard both exits' completion handling with a
  `useRef`-based flag (same pattern as `docs/feedback-round-1-plan.md` §1)
  so the real state change fires exactly once per discard.
- No changes needed to `src/lib/watchlist-client.ts` or
  `src/lib/seen-client.ts` — both already expose the functions this needs
  (`removeFromWatchlist`, `markSeen`).

## Verification

1. Strike from Deck on a saved movie: confirm the card visibly chars/burns
   with drifting ember particles before disappearing (not an instant pop),
   and that the movie is actually gone from the Watch Deck afterward
   (reopen the hand to confirm).
2. Discard on a fresh Hit Me pull: confirm the card flips face-down and
   slides off instead of vanishing, and that repeated Hit Me pulls
   afterward never show that same movie again in the session — confirms
   `markSeen` actually ran.
3. Confirm the existing "Reset Discards" control (already wired to
   `clearSeen()`) also clears Hit Me discards, since they now land in the
   same `seen_movies` table the swipe deck uses — a discarded Hit Me movie
   should be able to resurface again after a reset, same as a swiped-left
   movie would.
4. Repeat Strike from Deck and Discard several times in a row quickly:
   confirm whatever counts/state track these only move by exactly one each
   time, not two. This is the same stale-closure/double-fire risk already
   fixed once in `swipe-deck.tsx` (`docs/feedback-round-1-plan.md` §1), so
   the new `AnimatePresence` exit handlers here need the same ref-guard
   treatment, not a copy of the old buggy pattern.

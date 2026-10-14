# Reel Roulette: layout & responsive fixes (swipe, watch deck hand, spin)

## Status

**Complete (2026-10-14).** Every item is done or has moved to
`docs/watch-deck-spin-breathing-room-plan.md`. The hand still reads small on
a 1920x1080 monitor; that's tracked in the breathing-room plan.

## Context

Testing the current build on a laptop and a desktop PC surfaced three
layout/sizing issues that didn't show up the same way on both. Grounded
each one in the actual code rather than a guess, then verified the fixes
once implemented.

## 1. Watch Deck hand — readability fix

**Done:** the title-clipping fix, the base card size bump, and the
shrink-cap past 12 cards are all confirmed in `watch-deck-hand.tsx`
(`MAX_CARD_W`/`MIN_CARD_W` raised to 116/96, tuck reduced from ~38% to
~12%, shrink stops at `SHRINK_UNTIL = 12` instead of continuing forever).
The user tested the actual worst case — a 33-card hand, the smallest card
size the hand ever renders, at 100% browser zoom — and confirmed the
title and genre label are both legible as-is. No further work needed on
card size, tuck, or the shrink cap.

**Done (2026-10-14):** the plan's target turned out to be wrong — the hand renders `compact`, so the floor went on the compact branch (`max(8.5px,7.5cqw)`, icons `max(7.5px,6.5cqw)`, gap widened to `4cqw`). The full-size line was also bumped to `5.6cqw` (icons `5cqw`) for Swipe/Spin, and the Deal label got bigger with more room above it. Original scope: the font-size
floor on `movie-card.tsx`. Originally scoped as a blanket `clamp()` floor
across every text element on the card (title, genre, runtime/rating,
corner rank/suit index). Real testing narrowed this: title and genre both
hold up fine even on the worst-case 33-card hand, so they need no change.
Only the runtime/rating line is noticeably too small — it's the smallest
text on the card (`4.8cqw`, which works out to roughly 4.6px at the
96px-wide minimum card size).

**Fix:** put a `clamp()` floor on just the runtime/rating line in
`src/components/movie-card.tsx` (currently
`compact ? "gap-[2.5cqw] text-[7.5cqw]" : "gap-[3cqw] text-[4.8cqw]"` —
the non-compact `text-[4.8cqw]` is the one that's too small) — something
like `clamp(9px, 4.8cqw, <whatever its natural ceiling is at the card's
largest size>)`. Leave the title, genre label, and corner rank/suit index
exactly as they are — they're confirmed fine, no need to touch them.

## 2. Swipe screen — card sits too high on larger viewports

**Done.** Confirmed in `swipe-screen.tsx`: `FilterBar` + `SwipeDeck` are
now wrapped in a `flex flex-1 flex-col justify-center` container, so
leftover viewport height on a taller screen becomes centering space
instead of dead space below the card.

## 3. Spin — mechanisms don't scale up on larger viewports

**Superseded, not abandoned.** This item was not implemented under this
plan, but it hasn't been dropped — it's been folded into
`docs/watch-deck-spin-breathing-room-plan.md` alongside the Spin screen's
centering fix, since both address the same underlying idea (use extra
screen space productively rather than just padding it out). Track this
item there, not here.

## Files to touch (remaining work only)

- `src/components/movie-card.tsx` — `clamp()` floor on the runtime/rating
  line only (§1).

## Verification

1. On the 33-card hand (or any large hand), confirm the runtime/rating
   line is now comfortably readable at 100% browser zoom, matching how
   the title and genre label already read.
2. Spot-check the swipe deck and roulette screen afterward — both also
   render `MovieCard` at larger sizes than the hand — to confirm the new
   floor doesn't visibly change how the runtime/rating line looks there
   (a `clamp()` floor should only kick in at hand-sized cards, where the
   natural `cqw` value would otherwise fall below it).

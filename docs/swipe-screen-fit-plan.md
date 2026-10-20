# Reel Roulette: Swipe screen no longer fits in one screen

## Context

After the 5.0 catalog import added 3 genre suits (13 total), the Swipe
screen's genre chip row no longer fits the Reshuffle button on the same
line at typical desktop widths — Reshuffle now wraps onto its own row.
That's fine and should stay (confirmed with the user), but it's
currently happening by accident (wrapped inside `FilterBar`'s
`flex-wrap` row with only the 6px inter-chip gap separating it from the
genre chips above), and the page's card-sizing formula was never
updated for the extra row's height, so the page now needs to scroll
where it used to fit in one screen.

Confirmed directly on the live site (`reel-roulette-sable.vercel.app`),
not assumed: forcing the Swipe card down to its hardcoded minimum
(240px) and measuring the full page's natural height shows everything
*except* the card now needs 385px — but `swipe-deck.tsx`'s card-height
formula still reserves only 375px for it. That stale 10px is why the
page overflows at realistic window heights (it only goes unnoticed at
very tall/short windows, where the card's min/max clamp already caps
it regardless).

## Fix

1. **Give Reshuffle deliberate spacing, not accidental wrap.** In
   `src/components/swipe-screen.tsx`, stop passing the Reshuffle
   `Button` as a child of `FilterBar` (currently it renders inside
   `FilterBar`'s own `flex flex-wrap ... gap-1.5` row, so its position
   depends on wherever the chips happen to wrap to). Instead render it
   as an explicit sibling block directly below the `FilterBar`, with
   `mt-3` (12px) separating it from the chip row — up from today's
   accidental 6px gap.
2. **Correct the stale height budget.** In `src/components/swipe-deck.tsx`,
   change `CARD_HEIGHT`'s `clamp(240px, calc(100dvh - 375px), 420px)`
   to use `400px` instead of `375px` — covers the measured 385px actual
   chrome height plus the +6px added by the new margin, with a small
   buffer for cross-browser/zoom rendering variance.

No other files need to change — `FilterBar` itself (`filter-bar.tsx`)
is untouched; only how `swipe-screen.tsx` places its `children` and the
one constant in `swipe-deck.tsx`.

## Files to touch

- `src/components/swipe-screen.tsx` — move the Reshuffle button out of
  `FilterBar`'s children, into its own block with `mt-3`.
- `src/components/swipe-deck.tsx` — `CARD_HEIGHT`: `375px` → `400px`.

## Verification

1. At a realistic desktop window size (not maximized to a huge
   monitor), confirm the Swipe screen no longer shows a scrollbar —
   header, genre chips, Reshuffle, card, and footer all fit in one
   screen.
2. Confirm Reshuffle still sits directly under the genre chips with
   visible breathing room (not touching), not back on the same row as
   the chips.
3. Resize the window shorter and taller: confirm the card still clamps
   between 240px and 420px as before, with no new scroll at either
   extreme.
4. Check Spin separately — it has a different, not-yet-fixed cause
   (its sidebar has no equivalent height budget at all; see below) and
   is out of scope for this pass.

## Known separate issue (not part of this plan)

Spin also scrolls now, but for a different reason — its left sidebar
(pool selector + genre chips + the new "Skip Pictures Seen" toggle)
has no height-budget mechanism at all; it just grows with content, and
`roulette-screen.tsx`'s `flex flex-1 flex-col justify-center` centers
the whole block without shrinking it. Fixing Spin would mean
introducing a similar budgeted-height approach there, not just tuning
a constant — not yet designed, left for a separate plan.

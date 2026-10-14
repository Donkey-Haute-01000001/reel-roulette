# Reel Roulette: Watch Deck & Spin — use extra space instead of leaving it empty

## Status

**Complete (2026-10-14).** The Spin cabinet scaling (§2, second half) had
already shipped in `318c8dd` (xl/2xl steps via `useSlotScale`). This pass
added the Spin centring wrapper in `roulette-screen.tsx`, and for the Watch
Deck a `useDeckScale()` hook in `watch-deck-hand.tsx`: 1 up to 800px of
window height, growing with it, capped at 1.3. It drives the hand's card
size and spread directly, and the table height and table card width via a
`--deck-scale` CSS variable set on the Watch Deck screen. The hand stays
pinned with `mt-auto`. Checked on the laptop at 100% and at 80% zoom
(standing in for the 1080p monitor); no page scroll on either.

## Context

Following up on `docs/layout-responsive-plan.md` (which already fixed the
swipe screen's top-pinned layout and the Watch Deck hand's readability),
the user found two more screens with the same "content pinned to the top,
empty space left over" symptom on a bigger PC monitor (1920x1080) versus
their laptop: a growing empty gap between the Watch Deck's table and hand,
and dead space at the bottom of the Spin screen with the machine pinned to
the top.

Discussed the fix directly with the user rather than just distributing the
extra space as blank breathing room everywhere — too much of that risks
making the site feel empty on a big screen, which was the user's own
worry. Decided: the Watch Deck's table and hand should grow their own size
with the available space, the same way the swipe deck's card already does
via a `clamp()` tied to viewport height — using the space productively
instead of padding it out. For Spin: center the whole machine like the
swipe screen (confirmed good), and additionally let the cabinet itself
grow a bit on bigger screens rather than staying hard-capped at 340px
forever — this folds in the previously-deferred, lower-priority
cabinet-scaling item from `docs/layout-responsive-plan.md` §3, now paired
with the centering fix since it fits the same philosophy.

## 1. Watch Deck — table + hand card size scale with viewport, not blank gap

Confirmed via reading `watch-deck-screen.tsx`, `casino-table.tsx`, and
`watch-deck-hand.tsx`:

- `watch-deck-screen.tsx`'s outer wrapper
  (`min-h-[calc(100dvh-53px)] flex flex-col`, ~line 149) forces the whole
  screen to be at least full-viewport tall. The table section (wrapping
  `CasinoTable`) sits fixed-height right under the title; the hand wrapper
  (`mt-auto`, ~line 295) absorbs 100% of whatever's left in that box as
  blank margin above the hand. On a taller viewport (more `dvh`), that
  margin just grows — this is the reported gap.
- `casino-table.tsx` (~line 40) sizes the table card with a fixed height
  (`min-h-[210px] ... sm:h-[340px]`) — not viewport-aware.
- `watch-deck-hand.tsx` sizes hand cards from `MAX_CARD_W = 116` down to
  `MIN_CARD_W = 96` (px) — also not viewport-aware; the only thing that
  currently varies card size is hand length (`SHRINK_FROM`/`SHRINK_UNTIL`),
  not screen size.

**Fix:** tie both the table card's size and the hand's base card size to
available viewport height, the same pattern `swipe-deck.tsx` already uses
for its own card (`CARD_HEIGHT = clamp(240px, calc(100dvh - 375px), 420px)`):

- Give `CasinoTable` a height driven by something like
  `clamp(210px, calc(100dvh - Xpx), ~440-460px)` (X chosen to account for
  the title bar + hand height + paddings, mirroring how `swipe-deck.tsx`
  derived its own 375px budget).
- Give `watch-deck-hand.tsx`'s `MAX_CARD_W`/`MIN_CARD_W` a similar
  viewport-driven range instead of fixed constants — e.g. `MAX_CARD_W`
  scaling up toward roughly 140-150px on tall viewports, with
  `MIN_CARD_W` scaling proportionally, so the hand still feels compact on
  a laptop and fuller on a bigger monitor.
- Keep a real ceiling on both (the clamp's upper bound) so a very tall or
  4K display doesn't get comically oversized cards. Once that ceiling is
  hit, replace the current all-or-nothing `mt-auto` with a bounded gap (or
  light centering of the whole table+hand group) so any truly leftover
  space becomes modest breathing room, not a widening crack.

## 2. Spin — center the machine, and let the cabinet grow a bit on bigger screens

Confirmed via reading `roulette-screen.tsx`, `roulette-slot.tsx`, and
`slot-parts.tsx`:

- `roulette-screen.tsx`'s content wrapper (~line 49,
  `mx-auto max-w-5xl px-4 py-3 sm:px-6`) and `RouletteSlot`'s own top-level
  wrapper (`roulette-slot.tsx` ~line 256, `flex flex-col items-center
  gap-4`) have no `flex-1`/`justify-center`/`min-h` anywhere — identical
  root cause to the swipe screen's original bug. `<main>` in `layout.tsx`
  is `flex-1 flex-col` and stretches to fill the viewport, but nothing
  inside this screen consumes that leftover height, so it all collects as
  dead space below the machine.
- The cabinet itself is hard-capped at `lg:w-[340px]`
  (`roulette-slot.tsx` ~line 319) for every viewport ≥1024px, with no
  `xl:`/`2xl:` step — already flagged as the lower-priority §3 item in
  `docs/layout-responsive-plan.md`, now folded into this pass.

**Fix:**

- Wrap `roulette-screen.tsx`'s content (or `RouletteSlot`'s own outer
  wrapper) in a `flex flex-1 flex-col justify-center` container — the same
  fix already applied to `swipe-screen.tsx` — so leftover viewport height
  becomes centering space around the machine rather than dead space below
  it.
- Separately, let the cabinet itself grow a step or two on bigger
  screens — add `xl:`/`2xl:` width steps (e.g. `xl:w-[380px] 2xl:w-[420px]`)
  or a `clamp()` tied to viewport width — and scale the sub-mechanism
  constants in `slot-parts.tsx` (`TILE_H`, lever `ARM`, coin/tray sizes,
  `COIN_SPOTS` offsets) alongside it, so the reel geometry and lever/coin
  mechanisms grow together with the cabinet instead of just the outer
  frame scaling while everything inside stays laptop-sized. (Same
  technical approach already described in `docs/layout-responsive-plan.md`
  §3 — this plan just elevates its priority and pairs it with the
  centering fix.)

## Files to touch

- `src/components/watch-deck-screen.tsx` — replace/adjust the `mt-auto`
  hand-push mechanism once table/hand card sizes are viewport-driven (§1).
- `src/components/casino-table.tsx` — viewport-driven table card height
  (§1).
- `src/components/watch-deck-hand.tsx` — viewport-driven
  `MAX_CARD_W`/`MIN_CARD_W` range (§1).
- `src/components/roulette-screen.tsx` — centering flex wrapper around the
  Spin content (§2).
- `src/components/roulette-slot.tsx` — cabinet width `xl:`/`2xl:` steps or
  clamp (§2).
- `src/components/slot-parts.tsx` — scale lever/coin/tray constants
  alongside the cabinet (§2).

## Verification

1. Watch Deck on the PC (1920x1080) and the laptop: confirm the table and
   hand sit visibly closer together — a bigger table/bigger hand cards on
   the PC, not a widening empty gap — and that the hand still looks
   reasonable (not cramped) on the laptop's shorter viewport.
2. Spin on the PC: confirm the whole machine now sits with even breathing
   room above/below instead of pinned to the top with dead space below,
   and confirm the cabinet itself is visibly bigger than on the laptop
   (not just recentered at the same size).
3. Spin a few times after the cabinet-size change: confirm the reel
   alignment/animation still lines up correctly at the new size (the reel
   math depends on `TILE_H`, so this needs an actual spin, not just a
   glance).
4. Check a very tall or ultra-wide display if possible (or simulate via
   browser devtools viewport resizing) to confirm the Watch Deck's
   card-size ceiling actually caps growth rather than letting cards get
   absurdly large.

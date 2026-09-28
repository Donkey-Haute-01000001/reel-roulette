# Fix: Swipe deck shows the wrong "next" card

## Context

Reel Roulette's swipe deck (`src/components/swipe-deck.tsx`) lets users swipe
movie cards left (reroll) or right (save). The bug: after a swipe completes,
the card that appears next isn't reliably the *actual* next card in the
deck — it can look random/inconsistent instead of picking up in order.

Git history shows this has been fought before and lost:

- `8da6603` "Added queue of 2 for no random card swapping" — tried a
  **stacked** UI (top card + a peeking card behind it) so the user could see
  the next card coming.
- `fba6b6b` "Restore working swipe deck" — reverted that, back to rendering
  **only one card at a time** (current `HEAD`, and the current working tree
  is byte-identical to it modulo CRLF line endings — no real code changes
  pending).

So today's code already renders a single card with nothing behind it. The
user has confirmed the desired UX explicitly: **show nothing while a card is
mid-swipe; only reveal the new card once the exit is fully complete.** That
rules out re-attempting the stacked/peek approach — the fix should stay
within the single-card model and instead correct *what* becomes "current"
next, and *when* it's decided, so it can never look random.

### Expected UX sequence (confirmed with the user)

This is the exact frame-by-frame contract the implementation must satisfy —
worth stating explicitly because it's easy to accidentally violate one step
while fixing another:

1. A card is on screen, fully populated with one movie's details (poster,
   title, year, director, etc.) — no loading/skeleton state, ever, because
   all movie data is already in memory (`movies` prop) before render.
2. User swipes (drag past threshold) or taps reroll/save. The card animates
   off screen. Nothing else is rendered underneath or beside it — no peeking
   next card, no placeholder.
3. Once that exit animation finishes, there is a genuinely empty deck area
   for at least that one frame — not a placeholder card that then has its
   content swapped in.
4. The next card then appears, and it must appear **already fully
   populated** with its movie's details from the first frame it's visible —
   never mount blank/generic and then update once data "arrives" (there is
   no async data fetch here, so this is really about not rendering the new
   `SwipeCard` until its `movie` prop is already the correct, final one).

In short: populated card → (swipe) → animate out → empty → populated card.
Never: populated card → (swipe) → animate out → placeholder card → populated
card.

### Root cause (from reading `swipe-deck.tsx`)

Two separate issues, both inside `advance()`:

1. **Queue mutation is correct in order, but the refill step reshuffles the
   entire movie pool every time the queue dips below 4 items**, filtering
   out only the single most-recently-seen id (`lastIdRef.current`):

   ```ts
   setQueue((prev) => {
     const rest = prev.slice(1);
     if (rest.length < 4 && movies.length > 0) {
       const refill = shuffle(movies).filter((m) => m.id !== lastIdRef.current);
       return [...rest, ...refill];
     }
     return rest;
   });
   ```

   This means: (a) movies the user *just* saw a few cards ago can be
   reshuffled back in almost immediately, which reads as "random" rather
   than "the next card in a sensible deck order", and (b) a freshly shuffled
   `refill` can contain ids that are **already present in `rest`**, producing
   duplicate React keys (`key={movie.id}` in the render below) once those
   duplicates reach the front of the queue — a classic source of a
   component showing stale/wrong props for a render or two.

2. **`current` (and therefore what the user will see next) is only decided
   *after* the exit animation finishes**, inside `onAnimationComplete` →
   `advance()`. There's no intermediate "locked" state between "swipe
   committed" and "queue updated + new card rendered", so if `advance()`
   ever runs twice for one swipe (e.g. a second `onAnimationComplete` fire
   from the drag-elastic snap-back animation racing the exit animation) the
   queue can shift by an extra card, which also presents as "the wrong next
   card."

Neither of these is about a peeking second card — they're about the
**deck's internal ordering and re-render timing** producing an
unpredictable "current". That's the right layer to fix.

## Approach

Keep the current single-card render model (nothing shown behind the active
card). Fix the deck data structure and the commit timing:

1. **Replace the ad-hoc refill logic with a proper "shuffle bag" deck.**
   Maintain the queue as a full shuffled permutation of `movies` that only
   gets reshuffled once it's *exhausted*, rather than partially reshuffled
   every time it dips below an arbitrary threshold (4). When the bag runs
   out, generate a new shuffled bag from `movies`, excluding only the
   immediately-preceding card (so the same movie can't repeat back-to-back),
   and append it. This guarantees:
   - No duplicate ids can ever coexist in the queue (dedupe by construction,
     not by filtering one id after the fact).
   - "Next" always means "next un-seen card in the current shuffled pass",
     which reads as deliberate deck order instead of random.

2. **Decide the next card at the moment the swipe is committed, not when
   the exit animation finishes.** Split state into:
   - `queue`: the ordered deck (unchanged item, just correctly maintained).
   - `phase`: `"idle" | "exiting"` instead of the current `exiting: "left" |
     "right" | null` doing double duty as both "which direction" and "is an
     exit in flight".
   - When a swipe is committed (drag threshold crossed or a button
     pressed), synchronously pop the queue and compute the next card
     *once*, store the exit direction for the animation, and set an
     `isAnimating` guard that disables drag/buttons and ignores any further
     `onAnimationComplete` calls until the exit fully finishes. This closes
     the double-fire race described in root cause #2.
   - The next card is not rendered until `phase` returns to `"idle"` after
     the exit animation's `onAnimationComplete` — preserving the "show
     nothing until the swipe is complete" behavior that's already correct,
     but now backed by an explicit state machine instead of relying on
     incidental timing.

3. **Guard rendering with a single source of truth for "what's on screen".**
   `current` continues to be derived from `queue[0]`, but the queue update
   and the animation-direction-to-show are committed together in one state
   update, so there's never a render where `current` has changed but the
   exit animation hasn't caught up (or vice versa).

## Files to touch

- `src/components/swipe-deck.tsx` — all of the above. This is the only file
  with the bug; `roulette-screen.tsx` (filters → `movies` prop) and
  `movie-card.tsx` / `movie-poster.tsx` (presentational) don't need changes.
  (Both were reviewed: neither has any async/loading state — `MoviePoster`
  generates its art purely from CSS/props, no `<img>`, no fetch — so there's
  no downstream source of a "blank then updates" flash outside
  `swipe-deck.tsx`.)

## Implementation notes for whoever writes the code (Claude Code)

- Replace `shuffle(movies)`-on-every-refill with a bag: keep a ref or state
  holding the current shuffled bag and an index/slice pointer; when
  exhausted, reshuffle `movies` fresh (excluding the last-seen id from the
  *start* of the new bag only, to avoid immediate repeats) and concatenate.
- Collapse `exiting` + the implicit "is an exit in progress" into one
  explicit state value so `onAnimationComplete` can no-op safely if it fires
  more than once (e.g. `if (phase !== "exiting") return;` guard at the top
  of the handler).
- Keep `AnimatePresence` + single-child render as-is — don't reintroduce a
  second stacked card.
- Preserve existing behavior that must not regress: watchlist save on right
  swipe, "Rerolled"/"Saved" toast text, `seenCount`/`savedCount`, the detail
  dialog, and the `movies.length === 0` empty state.
- Keep the `useMounted` / hydration-safe first-shuffle pattern — that's
  solving a separate (correct) problem and isn't part of this bug.
- Do not mount the next `SwipeCard` until `queue[0]` already points at its
  final movie. There should be no version of this where a `SwipeCard`
  mounts, then a prop update changes which movie it's showing — that would
  produce exactly the "placeholder that then updates" the user explicitly
  ruled out. Since `key={movie.id}` already forces a fresh mount per movie,
  this falls out naturally as long as `current` is only ever set to the
  final next card (see root cause #2's race) — just don't undermine it by,
  e.g., pre-rendering the next card off-screen for a "prefetch" optimization.

## Verification

1. `npm run dev` (or `npm run build`) to confirm no type errors after the
   refactor (`tsconfig.tsbuildinfo` present, so this is a typed project —
   run `tsc --noEmit` or the existing lint/build script).
2. Manually swipe through more than one full lap of the deck (i.e., enough
   swipes to force at least 2 bag reshuffles) and confirm:
   - No card ever repeats within the same shuffled pass.
   - The screen shows nothing (no peeking card) while a card is animating
     off-screen, and the new card only appears after that animation
     completes.
   - Rapid repeated swipes/clicks (spam the save/reroll buttons) never skip
     two cards at once or show a flash of an unrelated card.
3. Check the browser console for React "duplicate key" warnings during an
   extended swipe session — this is the concrete regression signal for the
   duplicate-id bug in the old refill logic.

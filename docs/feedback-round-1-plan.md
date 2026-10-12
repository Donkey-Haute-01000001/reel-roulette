# Reel Roulette: feedback-session fixes and additions

## Context

A friend did a feedback pass on the live Reel Roulette build (the Victorian
casino restyle + card-game Watch Deck + coin-op Spin machine already shipped
— see the earlier `docs/cards-watchdeck-roulette-plan.md` and
`docs/swipe-fix-plan.md` for that history). They liked the concept, the
vibe, the text, and the look overall. This plan works through their punch
list. Everything below reflects the current actual code (read directly from
the repo, not assumed) plus the user's explicit answers to the open
questions this raised — noted inline wherever a decision was made rather
than guessed.

Deferred per the user (keep the site lean for now): item 7, bigger database
(IMDb CSV import / TMDB posters / Letterboxd) — moved to **Future**, not
tackled in this pass.

## 1. Counter increments by 2

**Corrected scope:** this is the **Keep pile count on the home swipe deck**
(`src/components/swipe-deck.tsx`), not the Spin/roulette counter — confirmed
directly by the user. Traced to an actual, concrete bug (not a guess):

`commitSwipe()` sets `phase = "exiting"` and starts the fly-to-pile
`animate`. When that finishes, `onAnimationComplete` calls `finishExit()`,
which pushes the card onto `savedPile`/`seenPile` and sets `phase = "idle"`.
That part is fine on its own. The bug is what happens *next*: once `phase`
flips to `"idle"`, `displayedMovie` becomes the new `current` card, which
has a different `key` — so `AnimatePresence` now removes the *old*
`SwipeCard` instance from the tree and plays **its own `exit` animation**
on it (`exit={{ opacity: 0, transition: { duration: exitTarget ? 0 : 0.2 } }}`).
That removal-animation is still the same `motion.div`, still wired to the
very same `onAnimationComplete` handler it had on its last real render —
and that handler's `exiting`/`onExitComplete` are whatever they were
*at that render*, i.e. still truthy, still pointing at a `finishExit`
closure where `phase === "exiting"`. So when the `exit` animation finishes
(even instantly, at `duration: 0`), `onAnimationComplete` fires **a second
time**, calls that stale `finishExit` again, and its guard —
`if (phase !== "exiting") return;` — checks the *closure's* `phase`, which
is still the old value, not the component's current state. The guard
doesn't actually guard anything here, and the card gets pushed onto the
pile twice. This is the same bug class the earlier swipe-deck fix
(`docs/swipe-fix-plan.md`) closed for the *queue-advance* path — it just
re-opened through this other path (`AnimatePresence`'s own `exit` prop also
triggering the same callback). It should affect both `savedPile` (Keep) and
`seenPile` (Discard) symmetrically, even though only Keep was reported.

**Fix:** replace the state-based guard with a ref, since refs aren't
captured per-render the way closures over state are:

```ts
const exitHandledRef = React.useRef(false);

// in commitSwipe(), when starting a new exit:
exitHandledRef.current = false;

// in finishExit():
if (exitHandledRef.current) return;
exitHandledRef.current = true;
// ...rest unchanged
```

This makes the second, stale `onAnimationComplete` call a genuine no-op
regardless of which closure it's holding. (Simplest alternative: give the
`exit` variant nothing to animate / `duration: 0` *and* strip the
`onAnimationComplete` handler specifically for that frozen removal render —
but the ref guard is more robust and doesn't depend on fighting
`AnimatePresence`'s internals.)

## 2. "Insert Coin" label should be clickable

**Current state:** `CoinSlot` (`slot-parts.tsx`) only has a click handler
for *returning* a coin (`onClick={onReturn}`, disabled unless `credited`).
Inserting a coin currently only works by clicking/dragging an individual
floating `Coin` button in the tray — the slot itself does nothing when
you're not yet credited, even though it reads "Insert Coin."

**Fix:** give `CoinSlot` a third mode — when `!credited` and at least one
coin remains, clicking it should insert a coin the same way clicking a
floating coin does (same fly-in animation, not a teleport), matching the
existing "click the lever" / "click the Spin button" affordance pattern.
Concretely: lift an imperative "insert the first available coin" action up
from `FloatingCoin`/`FloatingCoins` (e.g. expose it via a ref/handle, or
have `RouletteSlot` track which coin id is "next" and pass a callback down
that triggers that one coin's existing `flyIn()`), and wire `CoinSlot`'s
`onClick` to call it when not credited. Keep the existing per-coin click/drag
behavior as-is — this adds a second way in, it doesn't replace the first.

## 3. Fold — folds your whole hand back into the pool

**Confirmed scope:** not a per-card action. One **Fold** button empties your
*entire* Watch Deck for this session — every saved movie goes back to being
just part of the catalog (the catalog pool is already independent of the
watchlist, so "returning to the pool" is really just clearing the
watchlist). Mirrors the existing "shuffle discards back in" (`clearSeen()`
in `src/lib/seen-client.ts`) that already un-hides skipped swipe-deck cards
— Fold is the Watch Deck's equivalent bulk reset.

**Implementation:**
- New `clearWatchlist()` in `src/lib/watchlist-client.ts` — a single
  `.delete().eq("session_id", sessionId)` against the `watchlist` table
  (not a loop of per-movie deletes).
- New Fold button in `src/components/watch-deck-screen.tsx`, near the
  existing Hit Me / Deal controls. Since this is destructive and empties
  the whole hand, confirm before firing (reuse the existing `Dialog`
  component for a short "Fold your hand? This empties your whole Watch
  Deck." confirmation).
- On confirm: call `clearWatchlist()`, clear the table (`clearTable()`),
  and reset local `entries` state to `[]` (or re-`load()`).

## 4. "Seen It" — watched marking + remapped swipe meanings

**Naming collision, resolved:** the codebase already uses "seen" to mean
"swiped left / skipped during discovery" (`seen_movies` table,
`src/lib/seen-client.ts`, the swipe deck's discard pile). The new feature
means something different — "I've actually watched this film" — so it gets
its own name internally: **`watched`**, not `seen`, even though the
user-facing button is labeled "Seen It." This avoids two unrelated concepts
sharing one word in the codebase.

**Confirmed scope:** wired into *both* the home swipe deck and the Watch
Deck (not just one).

**Data model — new table in `supabase/schema.sql`:**

```sql
create table if not exists public.watched_movies (
  session_id text not null,
  movie_id   bigint not null references public.movies (id) on delete cascade,
  watched_at timestamptz not null default now(),
  primary key (session_id, movie_id)
);

alter table public.watched_movies enable row level security;
create policy "public read" on public.watched_movies for select using (true);
create policy "public insert" on public.watched_movies for insert with check (true);
create policy "public delete" on public.watched_movies for delete using (true);
```

New `src/lib/watched-client.ts` (mirrors `seen-client.ts`'s shape):
`fetchWatchedIds()`, `markWatched(movieId)`, `unmarkWatched(movieId)` — a
plain toggle (insert / delete), not append-only like `seen_movies`.

**Card visual:** `MovieCard` (`src/components/movie-card.tsx`) needs a new
optional `watched?: boolean` prop, and when true, a clipped/dog-eared corner
treatment layered onto the existing card frame (a folded-corner shape in a
corner that isn't already occupied by the rank/suit index — check against
the existing `CornerIndex` placement so they don't collide). `MovieCard` is
memoized on `movie` alone today; the memo comparison needs to account for
`watched` too once it's added as a prop.

**Seen It button:** a toggle shown wherever a card is actively being
decided on — the swipe deck's current card (`swipe-deck.tsx`) and the Watch
Deck's table card (`watch-deck-screen.tsx`). Toggles `watched` for that
movie via the new client helper.

**Remapped swipe/action meaning (the actual behavior change):**

| State | Left | Right |
|---|---|---|
| Not watched | Not interested *(today's skip → `seen_movies` discard pile — unchanged)* | Want to watch *(today's save → `watchlist` — unchanged)* |
| Watched | Once is enough *(remove from Watch Deck; also add to the discard pile so it stops resurfacing)* | Want to see again *(ensure it's saved/kept in the Watch Deck)* |

This touches the swipe handling in both `swipe-deck.tsx` and the table-card
controls in `watch-deck-screen.tsx` — both need to branch on whether the
card currently on screen is in the watched set before deciding what
left/right (or their button equivalents) actually do. This is the largest
code change in this batch; budget the most review time here.

## 5. Welcome box + "?" help

- **First-visit welcome:** a `Dialog` shown once per browser, gated by a
  `localStorage` flag (same pattern as `src/lib/session.ts`'s approach to
  per-browser state — e.g. `movie-roulette:welcomed`). Content: a short
  in-theme explainer of the concept (swipe/save/Watch Deck/Spin).
- **Reopen it anytime:** a "?" icon in `SiteNav` that opens the same dialog
  on demand. Needs the dialog's open state lifted somewhere shared (a small
  client component wrapping the welcome dialog with its own state, mounted
  once near the root, triggered either automatically on first visit or via
  the nav's "?" — simplest is a small context provider, or a shared
  module-level event the nav button dispatches).
- **Inline "?" tooltips next to important controls:** `watch-deck-screen.tsx`
  already has exactly this pattern hand-rolled once (`HitMeButton`'s
  `group-hover`/`group-focus-within` tooltip). Extract that into a small
  reusable `HelpTip` component (icon + the same hover/focus-reveal panel)
  so it isn't copy-pasted at every call site, then add it next to: the Spin
  pool/filter controls, Fold, and the new Seen It button at minimum.

## 6. Visual audit — fonts specifically

The user's main worry here is fonts in particular, not the theme overall.
Traced the actual font wiring rather than guessing:

**The architecture itself is sound.** Four fonts are loaded via
`next/font/google` in `src/app/layout.tsx` (Abril Fatface, Rye, Holtwood
One SC, Old Standard TT) and wired as CSS custom properties, and critically
`globals.css`'s `@theme inline` block **overrides Tailwind's own
`--font-sans`/`--font-serif` tokens** to point at these fonts (not just
adding new token names). That means `font-sans`/`font-serif` anywhere in
the codebase — including inside third-party Radix/shadcn primitives that
were never touched — already resolve to the custom fonts, not a system
default. A grep across every `.tsx` file for `font-sans|font-serif|font-display|font-slab|font-woodtype|font-mono`
turned up only themed usage; nothing is reaching for a literal system
font stack.

**Two concrete, real findings, both currently invisible (worth fixing for
hygiene, not because they're visibly broken today):**

1. **`src/components/ui/card.tsx` is 100% dead code** — not imported
   anywhere in `src/`. It's the original, never-restyled shadcn `Card`
   primitive left over from before the casino redesign. Harmless today
   because nothing renders it, but it's exactly the kind of leftover
   default-shadcn component that would look generic the moment anyone
   (human or a future Claude Code pass) reaches for `Card` out of habit.
   Delete it.
2. **`ui/card.tsx`'s `CardTitle` and `ui/dialog.tsx`'s `DialogTitle`** both
   pair `font-display` (Abril Fatface) with `font-bold`. Abril Fatface and
   the other two display/slab fonts here only ship one weight (400) — there
   is no real bold cut — so `font-bold` on top of them forces the browser
   to *synthesize* a fake bold, which is a classic "looks slightly cheap /
   generic" rendering artifact. Checked every live usage: both `DialogTitle`
   instances in the app (`swipe-deck.tsx`, `roulette-slot.tsx`) are
   `className="sr-only"` (screen-reader only, never rendered visually), and
   `CardTitle` is unreachable per #1 — so this isn't actually visible
   anywhere right now. Still worth dropping `font-bold` from `DialogTitle`
   on principle, since the moment it's used visibly (e.g. a non-sr-only
   dialog title, like the planned welcome dialog in §5) it would show the
   fake-bold artifact immediately.

**One spot using a non-custom font on purpose (probably fine, flagging for
your own judgment):** `roulette-slot.tsx` uses `font-mono` (Tailwind's
default monospace, not one of the four theme fonts) twice, for the Spin
counter and pool-size readout — reads as an intentional "digital LED
readout" choice against the mechanical cabinet, which arguably *should*
look different from the Victorian serif/slab set rather than match it. Call
this out to the user rather than silently changing it.

**What static review can't tell you:** whether the Google Fonts are
actually loading correctly in the browser you're testing in (a network
hiccup or blocked font request falls back to a system font silently, and
would look exactly like the "generic" complaint even though the code is
right) — worth an actual look at the rendered page's computed font-family
in devtools, not just trusting the source.

Also still true from the first pass: `public/favicon.ico` is the untouched
default Next.js icon (unchanged file size since the first commit) — the one
unambiguous "generic" tell on the whole site. Replace it with something
in-theme (a coin, a suit pip, the "R" medallion motif already on the coin
graphic in `slot-parts.tsx`).

## 7. CI/CD pipeline

Confirmed shape: lint → build (the build *is* the test gate — there's no
test framework in the repo yet, and build failure is a real, meaningful
check) → the build's output is kept as a pipeline artifact → deploy that
artifact to Vercel. GitHub Actions workflow (`.github/workflows/ci.yml`):

1. **Lint job:** `npm ci`, `npm run lint`.
2. **Build job** (needs lint): `npm ci`, `npm run build`. Note: `app/page.tsx`
   uses `export const dynamic = "force-dynamic"` and Supabase calls happen
   at request time, not build time, so the build itself shouldn't need real
   Supabase secrets to succeed — worth confirming during implementation,
   but don't plan on needing `NEXT_PUBLIC_SUPABASE_*` as build-time GitHub
   secrets unless that assumption turns out wrong. Upload `.next/` (or
   whatever `next build`'s output is) as a workflow artifact via
   `actions/upload-artifact`, so there's a concrete, inspectable build
   artifact per the "test it as an artifact" framing.
3. **Deploy job** (needs build, runs only on pushes to `main`): deploy that
   same artifact to Vercel via the Vercel CLI (`vercel deploy --prebuilt`
   against the already-built output, rather than letting Vercel rebuild
   from source independently — keeps "what we tested" and "what we
   deployed" the same artifact). Requires three GitHub repo secrets the
   user creates themselves (can't be done from here): `VERCEL_TOKEN`,
   `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (from the Vercel project's settings).
4. PRs run lint + build only (no deploy); only a merge to `main` deploys.

## Future (not in this pass)

- **Bigger database** (deferred by the user — keep the site lean for now):
  IMDb-style CSV import for a larger seed set; TMDB API for real
  poster/metadata art later (needs a TMDB API key from the user, TMDB's
  attribution requirement, and a decision on whether real posters replace
  today's generated card-medallion art or sit alongside it); Letterboxd
  later still, pending API approval — in the meantime, users could upload
  their own Letterboxd CSV export as a stand-in.
- **Earn coins by sharing a link:** a referral mechanic — sketch only, not
  designed yet. Needs anti-abuse thought (what stops someone just reloading
  their own share link) before it's worth detailing further.

## Files to touch

- `src/components/swipe-deck.tsx` — `exitHandledRef` guard fixing the Keep/
  Discard double-count (§1); Seen It button + watched-aware swipe branching
  (§4).
- `src/components/slot-parts.tsx` — CoinSlot click-to-insert (§2).
- `src/lib/watchlist-client.ts` — add `clearWatchlist()` (§3).
- `src/components/watch-deck-screen.tsx` — Fold button + confirm dialog (§3);
  Seen It button + watched-aware action branching on the table card (§4);
  Fold/Seen It help tips (§5).
- `src/components/movie-card.tsx` — `watched` prop + dog-ear corner (§4).
- New `src/lib/watched-client.ts` (§4).
- `supabase/schema.sql` — add `watched_movies` table + policies (§4).
- New welcome dialog component + `HelpTip` component; `src/components/site-nav.tsx`
  gets the "?" trigger (§5).
- `public/favicon.ico`; delete unused `src/components/ui/card.tsx`; drop
  `font-bold` from `ui/dialog.tsx`'s `DialogTitle` (§6).
- New `.github/workflows/ci.yml` (§7).

## Verification

1. Keep/Discard a card on the home swipe deck, confirm the pile count goes
   up by exactly 1 each time (not 2) — the concrete repro for §1.
2. Click (not drag) the "Insert Coin" slot directly with coins available —
   confirms a coin flies in and credits a spin, same as clicking a floating
   coin.
3. Fold with a few saved movies: confirms the whole Watch Deck empties, the
   table clears, and those movies are selectable again elsewhere (e.g. Hit
   Me / the swipe deck) exactly as if they'd never been saved.
4. Mark a card watched (dog-ear appears), confirm swipe/button meanings
   change on both the home swipe deck and a Watch Deck table card; unmark
   it, confirm meanings revert.
5. First visit in a fresh browser profile (or cleared localStorage) shows
   the welcome dialog once; the nav's "?" reopens it on a later visit;
   hovering/focusing a help-tipped control shows its tip.
6. `npm run build` locally still succeeds after all changes (this doubles
   as a pre-check for the new CI pipeline).
7. Push a branch/PR: confirm GitHub Actions runs lint + build and uploads
   an artifact, without deploying; merge to `main` (once Vercel secrets are
   in place) and confirm it deploys that exact artifact.

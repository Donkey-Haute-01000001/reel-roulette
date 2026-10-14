"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { Bookmark, Eye, Shuffle, Trash2, Undo2, X } from "lucide-react";

import type { Movie, WatchlistEntry } from "@/lib/types";
import {
  addToWatchlist,
  clearWatchlist,
  fetchWatchlist,
  removeFromWatchlist,
} from "@/lib/watchlist-client";
import { fetchWatchedIds, toggleWatchedIn } from "@/lib/watched-client";
import { clearSeen, fetchSeenIds, markSeen } from "@/lib/seen-client";
import { isSupabaseConfigured } from "@/lib/supabase";
import { GildedTitle } from "@/components/broadside";
import { CardBack } from "@/components/card-back";
import { CasinoTable, hitMeTip } from "@/components/casino-table";
import { HelpTip } from "@/components/help-tip";
import { MovieCard } from "@/components/movie-card";
import { MovieDetails } from "@/components/movie-details";
import { WatchDeckHand, useDeckScale } from "@/components/watch-deck-hand";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog, ShuffleAllDiscardsDialog } from "@/components/confirm-dialog";
import { cn, shuffle } from "@/lib/utils";

// Where the card on the table came from:
// - "hand":  played face-up from your hand (slides up from below)
// - "deck":  dealt face-down off your deck on the felt (flies in from the right, flips)
// - "house": Hit me — a card you haven't saved yet (flies in from the house shoe on the left, flips)
type Source = "hand" | "deck" | "house";

const DEAL_FROM: Record<Source, { x: number; y: number; rotate: number; scale: number }> = {
  hand: { x: 0, y: 220, rotate: -12, scale: 0.6 },
  deck: { x: 420, y: -30, rotate: 28, scale: 0.45 },
  house: { x: -420, y: -30, rotate: -28, scale: 0.45 },
};

// How the card leaves the table:
// - "burn":    Strike from Deck — it chars and gives off embers, then fades
// - "discard": Discard — it flips face-down and slides off the near edge
// - "hand":    Back to Hand — it drops back down into the hand
// - "fade":    replaced by another card, or the deck is folded
type ExitKind = "burn" | "discard" | "hand" | "fade";

// Each layer of the table card reads the exit kind (AnimatePresence's
// `custom`) when it's removed, so a card that's already gone still leaves
// the right way.
const CARD_EXIT: Variants = {
  exit: (kind: ExitKind) => {
    switch (kind) {
      case "burn":
        // The face and its flames do the work; this just waits for them.
        return {};
      case "discard":
        return { y: 280, rotate: 10, opacity: 0, transition: { delay: 0.2, duration: 0.4, ease: "easeIn" } };
      case "hand":
        return { ...DEAL_FROM.hand, opacity: 0, transition: { duration: 0.35, ease: "easeIn" } };
      default:
        return { opacity: 0, scale: 0.9, transition: { duration: 0.2 } };
    }
  },
};

const FLIP_EXIT: Variants = {
  exit: (kind: ExitKind) => (kind === "discard" ? { rotateY: 180, transition: { duration: 0.3 } } : {}),
};

// Strike from Deck burns the card: a burn line climbs from the bottom edge
// to the top, eating it away, with a glowing, charred band just above it
// and flame flakes and smoke thrown off as it goes. About a second in all.
//
// The face is clipped from below. The clip box reaches 30% past the card on
// every side (so the card's shadow isn't cut off), so the burn line travels
// from 130% (below the card) to -30% (above it), measured from the top.
const BURN_START = 0.08;
const BURN_SWEEP = 0.85; // bottom of the clip box to the top
const burnLineAt = (top: number) => BURN_START + ((130 - top) / 160) * BURN_SWEEP;

const CHAR_EXIT: Variants = {
  exit: (kind: ExitKind) =>
    kind === "burn"
      ? {
          clipPath: "inset(-30% -30% 130% -30%)",
          transition: { delay: BURN_START, duration: BURN_SWEEP, ease: "linear" },
        }
      : {},
};

// The scorched band riding the burn line: its bottom edge sits on the line
// (so it climbs from 100% to -60%, 30% tall), glowing where the card is
// burning and fading through char into the untouched card above.
const SCORCH_EXIT: Variants = {
  exit: (kind: ExitKind) =>
    kind === "burn"
      ? { top: "-60%", transition: { delay: BURN_START, duration: BURN_SWEEP, ease: "linear" } }
      : {},
};

// Flame flakes thrown off the burn line: where each starts (% of the card),
// how far it flies (px), its spin, and its colour (white-hot, yellow, orange).
// Each catches as the burn line reaches its height.
const FLAKE_COLORS = ["#fff4d6", "#ffd23f", "#ff9a1f"];
const FLAKES = [
  { left: 12, top: 94, dx: -26, dy: -40, spin: -60, c: 0 },
  { left: 40, top: 96, dx: -8, dy: -55, spin: 40, c: 1 },
  { left: 68, top: 92, dx: 20, dy: -45, spin: 80, c: 2 },
  { left: 86, top: 86, dx: 30, dy: -35, spin: -40, c: 0 },
  { left: 24, top: 76, dx: -30, dy: -50, spin: 70, c: 2 },
  { left: 56, top: 72, dx: 10, dy: -60, spin: -80, c: 0 },
  { left: 80, top: 64, dx: 26, dy: -50, spin: 50, c: 1 },
  { left: 8, top: 58, dx: -28, dy: -40, spin: -50, c: 1 },
  { left: 38, top: 52, dx: -14, dy: -65, spin: 90, c: 2 },
  { left: 66, top: 40, dx: 18, dy: -55, spin: -70, c: 0 },
  { left: 18, top: 32, dx: -24, dy: -50, spin: 60, c: 2 },
  { left: 50, top: 22, dx: 4, dy: -60, spin: -40, c: 1 },
  { left: 84, top: 16, dx: 24, dy: -45, spin: 80, c: 2 },
  { left: 30, top: 8, dx: -16, dy: -50, spin: -60, c: 0 },
];

const flakeExit = (f: (typeof FLAKES)[number]): Variants => ({
  exit: (kind: ExitKind) =>
    kind === "burn"
      ? {
          opacity: [0, 1, 1, 0],
          scale: [0.5, 1.25, 0.9, 0.3],
          x: f.dx,
          y: f.dy,
          rotate: f.spin,
          backgroundColor: [FLAKE_COLORS[f.c], "#ffb020", "#ff6a00"],
          transition: { duration: 0.6, delay: burnLineAt(f.top), ease: "easeOut" },
        }
      : {},
});

// Soft puffs of smoke left behind by the burn line.
const SMOKE = [
  { left: 30, top: 80, dx: -10, dy: -30 },
  { left: 64, top: 62, dx: 12, dy: -35 },
  { left: 22, top: 40, dx: -12, dy: -30 },
  { left: 58, top: 18, dx: 8, dy: -35 },
];

const smokeExit = (p: (typeof SMOKE)[number]): Variants => ({
  exit: (kind: ExitKind) =>
    kind === "burn"
      ? {
          opacity: [0, 0.55, 0],
          scale: [0.6, 1.6],
          x: p.dx,
          y: p.dy,
          transition: { duration: 0.8, delay: burnLineAt(p.top), ease: "easeOut" },
        }
      : {},
});

export function WatchDeckScreen({
  catalog,
  initialPlayId = null,
}: {
  catalog: Movie[];
  initialPlayId?: number | null;
}) {
  const deckScale = useDeckScale();
  const [entries, setEntries] = React.useState<WatchlistEntry[] | null>(null);
  const [table, setTable] = React.useState<{ movie: Movie; from: Source } | null>(null);
  // A card asked for by the URL (e.g. after adding a Spin result), played
  // to the table once the Watch Deck has loaded.
  const [pendingPlayId, setPendingPlayId] = React.useState<number | null>(initialPlayId);
  // Bumped on every play so re-dealing the same card still animates in.
  const [dealKey, setDealKey] = React.useState(0);
  const [adding, setAdding] = React.useState(false);
  // Pictures marked "Seen It": their corner is turned down.
  const [watchedIds, setWatchedIds] = React.useState<Set<number>>(() => new Set());
  const [foldOpen, setFoldOpen] = React.useState(false);
  // The discard pile (swiped left, passed on, or discarded from the table):
  // Hit Me skips these, and Reset Discards above the hand shows the count.
  const [discardIds, setDiscardIds] = React.useState<Set<number>>(() => new Set());
  const discardCount = discardIds.size;
  const [exitKind, setExitKind] = React.useState<ExitKind>("fade");
  const [resetOpen, setResetOpen] = React.useState(false);

  const load = React.useCallback(() => {
    fetchWatchlist().then(setEntries);
  }, []);

  React.useEffect(() => {
    load();
    fetchWatchedIds().then(setWatchedIds);
    fetchSeenIds().then(setDiscardIds);
  }, [load]);

  const movies = React.useMemo(() => (entries ?? []).map((e) => e.movies), [entries]);
  const savedIds = React.useMemo(() => new Set(movies.map((m) => m.id)), [movies]);

  const pendingMovie =
    pendingPlayId !== null ? (movies.find((m) => m.id === pendingPlayId) ?? null) : null;
  const onTable = table ?? (pendingMovie ? { movie: pendingMovie, from: "hand" as const } : null);
  const inDeck = onTable !== null && savedIds.has(onTable.movie.id);
  const tableWatched = onTable !== null && watchedIds.has(onTable.movie.id);

  const hand = React.useMemo(
    () => movies.filter((m) => m.id !== onTable?.movie.id),
    [movies, onTable?.movie.id]
  );
  // Hit me draws only from pictures you haven't saved or discarded.
  const housePool = React.useMemo(
    () =>
      catalog.filter(
        (m) => !savedIds.has(m.id) && !discardIds.has(m.id) && m.id !== onTable?.movie.id
      ),
    [catalog, savedIds, discardIds, onTable?.movie.id]
  );

  const play = (movie: Movie, from: Source) => {
    setExitKind("fade");
    setTable({ movie, from });
    setPendingPlayId(null);
    setDealKey((k) => k + 1);
  };

  const clearTable = () => {
    setTable(null);
    setPendingPlayId(null);
  };

  const hitMe = () => {
    if (housePool.length > 0) play(shuffle(housePool)[0], "house");
  };

  const dealFromHand = () => {
    if (hand.length > 0) play(shuffle(hand)[0], "deck");
  };

  // The table clears (and the change is saved) at once; the card's exit
  // animation plays out after it's gone, so a second click can't land.
  const backToHand = () => {
    setExitKind("hand");
    clearTable();
  };

  // Discard a Hit Me card: onto the discard pile, like a left swipe.
  const handleDiscard = (movieId: number) => {
    setExitKind("discard");
    clearTable();
    setDiscardIds((prev) => new Set(prev).add(movieId));
    markSeen(movieId);
  };

  const handleRemove = async (movieId: number) => {
    setExitKind("burn");
    clearTable();
    setEntries((prev) => (prev ? prev.filter((e) => e.movie_id !== movieId) : prev));
    await removeFromWatchlist(movieId);
  };

  // Keeps the card on the table; it just becomes one of yours.
  const handleAdd = async (movie: Movie) => {
    setAdding(true);
    if (await addToWatchlist(movie.id)) load();
    setAdding(false);
  };

  const toggleWatched = (movie: Movie) => setWatchedIds(toggleWatchedIn(watchedIds, movie.id));

  // Fold: every card in the Watch Deck goes back to the house.
  const fold = async () => {
    await clearWatchlist();
    setExitKind("fade");
    clearTable();
    setEntries([]);
  };

  // Every discarded picture goes back to being dealt (asked first).
  const resetDiscards = async () => {
    await clearSeen();
    setDiscardIds(new Set());
  };

  const from = onTable?.from ?? "hand";

  return (
    // At least a full screen tall (less the nav and the main's top padding),
    // with the hand pushed to the bottom, so a tucked hand sinks off the
    // screen's edge. Clipped top-to-bottom (overflow-y: clip) so the cards
    // below the edge are truly cut off, not left as blank space to scroll
    // into. (This page has no footer for the same reason.)
    <div
      className="mx-auto flex min-h-[calc(100dvh-53px)] max-w-5xl flex-col overflow-y-clip px-4 pt-3 sm:px-6"
      style={{ "--deck-scale": deckScale } as React.CSSProperties}
    >
      <GildedTitle className="mb-3" title="Watch Deck" tagline="Your hand awaits." />

      {!isSupabaseConfigured && (
        <p className="broadside mx-auto mb-6 max-w-xl px-4 py-3 text-center font-serif text-sm">
          Connect a Supabase project to enable the Watch Deck.
        </p>
      )}

      {entries === null ? (
        <Skeleton className="h-[230px] rounded-[48px] sm:rounded-[140px]" />
      ) : (
        <>
          {/* On wider screens the count and Hit Me live on the table itself
              (the house shoe); phones, where the shoe is hidden, get this row. */}
          <div className="mb-3 flex items-center justify-between gap-3 sm:hidden">
            <p className="font-slab text-[10px] tracking-[0.2em] text-gold-light uppercase">
              {hand.length} {hand.length === 1 ? "Card" : "Cards"} in Hand
            </p>
            <div className="flex items-center gap-2">
              {movies.length > 0 && <FoldButton onClick={() => setFoldOpen(true)} />}
              <HitMeButton onClick={hitMe} disabled={housePool.length === 0} />
            </div>
          </div>

          <div className="relative">
            {/* Set into the top of the table's wooden rail, like a small
                engraved label, so it takes no room of its own. Quiet: the
                count only shows once you ask. */}
            {discardCount > 0 && (
              <p className="absolute top-0 left-1/2 z-10 flex h-3 -translate-x-1/2 items-center sm:h-4">
                <button
                  type="button"
                  onClick={() => setResetOpen(true)}
                  className="font-slab text-[8px] leading-none tracking-[0.2em] whitespace-nowrap text-gold-light/60 uppercase underline-offset-2 outline-none hover:text-gold-light hover:underline focus-visible:text-gold-light focus-visible:underline"
                >
                  Reset Discards
                </button>
              </p>
            )}
            <CasinoTable
              deckCount={hand.length}
              onDeal={dealFromHand}
              houseDisabled={housePool.length === 0}
              onHitMe={hitMe}
              fold={movies.length > 0 ? <FoldButton onClick={() => setFoldOpen(true)} /> : null}
            >
              {/* popLayout: a leaving card is lifted out of the row, so the
                  next card (or the empty spot) takes its place straight away. */}
              <AnimatePresence mode="popLayout" custom={exitKind}>
                {onTable ? (
                  [
                    <motion.div
                      key={`${onTable.movie.id}-${dealKey}`}
                      className="relative w-[116px] shrink-0 [perspective:900px] sm:w-[calc(124px*var(--deck-scale,1))]"
                      initial={{ ...DEAL_FROM[from], opacity: 0 }}
                      animate={{ x: 0, y: 0, scale: 1, rotate: -3, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 240, damping: 24 }}
                      variants={CARD_EXIT}
                      exit="exit"
                    >
                      <motion.div
                        className="relative [transform-style:preserve-3d]"
                        initial={{ rotateY: from === "hand" ? 0 : 180 }}
                        animate={{ rotateY: 0 }}
                        transition={{ duration: 0.65, delay: 0.12, ease: [0.3, 0.7, 0.3, 1] }}
                        variants={FLIP_EXIT}
                        exit="exit"
                      >
                        <motion.div
                          className="relative [backface-visibility:hidden]"
                          animate={{ clipPath: "inset(-30% -30% -30% -30%)" }}
                          variants={CHAR_EXIT}
                          exit="exit"
                        >
                          <MovieCard
                            movie={onTable.movie}
                            watched={tableWatched}
                            className="shadow-[0_14px_30px_rgb(0_0_0/0.55)]"
                          />
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 overflow-hidden rounded-[7%/5%]"
                          >
                            <motion.span
                              className="absolute inset-x-0 h-[30%]"
                              style={{
                                backgroundImage:
                                  "linear-gradient(to top, #ffe08a 0%, #ff8a1f 5%, #8a2e08 14%, rgb(30 14 6 / 0.9) 30%, rgb(30 14 6 / 0.45) 60%, transparent 100%)",
                              }}
                              initial={{ top: "100%" }}
                              animate={{ top: "100%" }}
                              variants={SCORCH_EXIT}
                              exit="exit"
                            />
                          </span>
                        </motion.div>
                        {/* The back: shown while dealt face-down, and when discarded. */}
                        <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden]">
                          <CardBack className="shadow-[0_14px_30px_rgb(0_0_0/0.55)]" />
                        </div>
                      </motion.div>
                      {SMOKE.map((p, i) => (
                        <motion.span
                          key={`smoke-${i}`}
                          aria-hidden
                          className="pointer-events-none absolute aspect-square w-[34%] rounded-full bg-[#3b2a1e]/60 blur-md"
                          style={{ left: `${p.left - 17}%`, top: `${p.top - 12}%` }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0 }}
                          variants={smokeExit(p)}
                          exit="exit"
                        />
                      ))}
                      {FLAKES.map((f, i) => (
                        <motion.span
                          key={`flake-${i}`}
                          aria-hidden
                          className="pointer-events-none absolute aspect-[5/3] w-[12%] rounded-[0_100%_0_100%] shadow-[0_0_8px_rgb(255_160_40/0.8)]"
                          style={{
                            left: `${f.left - 6}%`,
                            top: `${f.top - 4}%`,
                            backgroundColor: FLAKE_COLORS[f.c],
                          }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0 }}
                          variants={flakeExit(f)}
                          exit="exit"
                        />
                      ))}
                    </motion.div>,
                    <motion.div
                      key={`details-${onTable.movie.id}-${dealKey}`}
                      // Set a size smaller (zoom, so it takes up less room too),
                      // keeping even the longest placard clear of the gold line.
                      className="broadside w-full max-w-[460px] px-4 py-2.5 [zoom:0.88]"
                      initial={{ opacity: 0, y: 12, rotate: 1 }}
                      animate={{ opacity: 1, y: 0, rotate: 0.6 }}
                      exit={{ opacity: 0, y: 8, transition: { duration: 0.2 } }}
                      transition={{ delay: 0.15, duration: 0.35 }}
                    >
                      <MovieDetails
                        movie={onTable.movie}
                        kicker={inDeck ? "On the Table" : "Fresh from the House"}
                        compact
                      />
                      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                        {inDeck ? (
                          <>
                            <Button variant="secondary" size="sm" className="gap-1.5" onClick={backToHand}>
                              <Undo2 className="size-3.5" /> Back to Hand
                            </Button>
                            <Button
                              size="sm"
                              className="gap-1.5 border-crimson/60 bg-transparent text-crimson shadow-none hover:bg-crimson/10"
                              onClick={() => handleRemove(onTable.movie.id)}
                            >
                              <Trash2 className="size-3.5" /> Strike from Deck
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              className="gap-1.5"
                              disabled={adding}
                              onClick={() => handleAdd(onTable.movie)}
                            >
                              <Bookmark className="size-3.5" /> {adding ? "Adding…" : "Add to Watch Deck"}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => handleDiscard(onTable.movie.id)}
                            >
                              <X className="size-3.5" /> Discard
                            </Button>
                          </>
                        )}
                        <span className="inline-flex items-center gap-0.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            aria-pressed={tableWatched}
                            className={cn("gap-1.5", tableWatched && "border-ink/70 bg-ink/10")}
                            onClick={() => toggleWatched(onTable.movie)}
                          >
                            <Eye className="size-3.5" /> {tableWatched ? "Seen It ✓" : "Seen It"}
                          </Button>
                          <HelpTip title="Seen It" tone="ink" side="top" align="end">
                            Mark a picture you&apos;ve already watched, and its corner is turned down.
                          </HelpTip>
                        </span>
                      </div>
                    </motion.div>,
                  ]
                ) : (
                  <motion.div
                    key="empty"
                    className="flex aspect-[5/7] w-[120px] items-center justify-center rounded-[10px] border-2 border-dashed border-gold/60 p-3 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.35, duration: 0.3 } }}
                    exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  >
                    <span className="font-slab text-[10px] leading-relaxed tracking-[0.2em] text-gold-light/80 uppercase">
                      Play a Card Here
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </CasinoTable>
          </div>

          <div className="mt-auto pt-2">
            {movies.length > 0 ? (
              <WatchDeckHand
                movies={hand}
                watchedIds={watchedIds}
                tucked
                scale={deckScale}
                onPlay={(movie) => play(movie, "hand")}
              />
            ) : (
              <p className="py-10 text-center font-serif text-sm text-paper/70 italic">
                Your hand is empty.{" "}
                <Link href="/" className="text-gold-light underline underline-offset-4">
                  Swipe right
                </Link>{" "}
                on a few pictures to be dealt in.
              </p>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={foldOpen}
        onOpenChange={setFoldOpen}
        title="Fold Your Hand?"
        confirmLabel="Fold"
        busyLabel="Folding…"
        cancelLabel="Keep Playing"
        onConfirm={fold}
      >
        All {movies.length} {movies.length === 1 ? "card" : "cards"} in your Watch Deck go back to the
        house, to be dealt anew on the Swipe deck or by the dealer. There&apos;s no taking it back.
      </ConfirmDialog>
      <ShuffleAllDiscardsDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        count={discardCount}
        onConfirm={resetDiscards}
      />
    </div>
  );
}

// Fold: empty the whole Watch Deck back into the house. Asks first.
function FoldButton({ onClick }: { onClick: () => void }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <button
        type="button"
        onClick={onClick}
        className="rounded-[3px] border border-gold/60 px-2 py-1 font-slab text-[8px] tracking-[0.2em] text-gold-light uppercase outline-none hover:border-gold-light hover:bg-black/20 focus-visible:ring-2 focus-visible:ring-gold-light"
      >
        Fold
      </button>
      <HelpTip title="Fold" align="end">
        Fold your hand: every card in your Watch Deck goes back to the house at once, and the table
        is cleared. The house asks before it takes them.
      </HelpTip>
    </span>
  );
}

// Hit me (phones), with a "?" beside it explaining it.
function HitMeButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <Button size="sm" className="gap-1.5" onClick={onClick} disabled={disabled}>
        <Shuffle className="size-3.5" /> Hit Me
      </Button>
      <HelpTip title="Hit Me" align="end">
        {hitMeTip(disabled)}
      </HelpTip>
    </span>
  );
}

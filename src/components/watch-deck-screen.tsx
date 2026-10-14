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
        return { opacity: 0, scale: 0.94, transition: { delay: 0.45, duration: 0.45 } };
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

// The card face chars to near-black as it burns.
const CHAR_EXIT: Variants = {
  exit: (kind: ExitKind) =>
    kind === "burn" ? { filter: "sepia(1) brightness(0.2)", transition: { duration: 0.5 } } : {},
};

// Embers that drift up off a burning card: where each starts (% of the
// card), how far it drifts (px), and when it catches.
const EMBERS = [
  { left: 18, top: 72, dx: -16, dy: -90, delay: 0.05 },
  { left: 42, top: 85, dx: 6, dy: -120, delay: 0.15 },
  { left: 70, top: 76, dx: 18, dy: -100, delay: 0.1 },
  { left: 30, top: 50, dx: -10, dy: -110, delay: 0.25 },
  { left: 60, top: 45, dx: 12, dy: -95, delay: 0.3 },
  { left: 82, top: 60, dx: 22, dy: -80, delay: 0.2 },
  { left: 50, top: 25, dx: -4, dy: -85, delay: 0.4 },
  { left: 12, top: 35, dx: -20, dy: -70, delay: 0.35 },
];

const emberExit = (dx: number, dy: number, delay: number): Variants => ({
  exit: (kind: ExitKind) =>
    kind === "burn"
      ? {
          opacity: [0, 1, 0],
          x: dx,
          y: dy,
          scale: [1, 1, 0.4],
          transition: { duration: 0.9, delay, ease: "easeOut" },
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
                          className="[backface-visibility:hidden]"
                          animate={{ filter: "sepia(0) brightness(1)" }}
                          variants={CHAR_EXIT}
                          exit="exit"
                        >
                          <MovieCard
                            movie={onTable.movie}
                            watched={tableWatched}
                            className="shadow-[0_14px_30px_rgb(0_0_0/0.55)]"
                          />
                        </motion.div>
                        {/* The back: shown while dealt face-down, and when discarded. */}
                        <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden]">
                          <CardBack className="shadow-[0_14px_30px_rgb(0_0_0/0.55)]" />
                        </div>
                      </motion.div>
                      {EMBERS.map((e, i) => (
                        <motion.span
                          key={i}
                          aria-hidden
                          className="pointer-events-none absolute size-1.5 rounded-full bg-[#ffb347] shadow-[0_0_6px_2px_rgb(255_120_40/0.7)]"
                          style={{ left: `${e.left}%`, top: `${e.top}%` }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0 }}
                          variants={emberExit(e.dx, e.dy, e.delay)}
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

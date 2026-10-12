"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Bookmark, Eye, Shuffle, Trash2, Undo2, X } from "lucide-react";

import type { Movie, WatchlistEntry } from "@/lib/types";
import {
  addToWatchlist,
  clearWatchlist,
  fetchWatchlist,
  removeFromWatchlist,
} from "@/lib/watchlist-client";
import { fetchWatchedIds, toggleWatchedIn } from "@/lib/watched-client";
import { clearSeen, fetchSeenIds } from "@/lib/seen-client";
import { isSupabaseConfigured } from "@/lib/supabase";
import { GildedTitle } from "@/components/broadside";
import { CardBack } from "@/components/card-back";
import { CasinoTable, hitMeTip } from "@/components/casino-table";
import { HelpTip } from "@/components/help-tip";
import { MovieCard } from "@/components/movie-card";
import { MovieDetails } from "@/components/movie-details";
import { WatchDeckHand } from "@/components/watch-deck-hand";
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

export function WatchDeckScreen({
  catalog,
  initialPlayId = null,
}: {
  catalog: Movie[];
  initialPlayId?: number | null;
}) {
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
  // How many pictures sit in the discard pile (swiped left or passed on),
  // for Reset Discards above the hand.
  const [discardCount, setDiscardCount] = React.useState(0);
  const [resetOpen, setResetOpen] = React.useState(false);

  const load = React.useCallback(() => {
    fetchWatchlist().then(setEntries);
  }, []);

  React.useEffect(() => {
    load();
    fetchWatchedIds().then(setWatchedIds);
    fetchSeenIds().then((ids) => setDiscardCount(ids.size));
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
  // Hit me draws only from pictures you haven't saved yet.
  const housePool = React.useMemo(
    () => catalog.filter((m) => !savedIds.has(m.id) && m.id !== onTable?.movie.id),
    [catalog, savedIds, onTable?.movie.id]
  );

  const play = (movie: Movie, from: Source) => {
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

  const handleRemove = async (movieId: number) => {
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
    clearTable();
    setEntries([]);
  };

  // Every discarded picture goes back to being dealt (asked first).
  const resetDiscards = async () => {
    await clearSeen();
    setDiscardCount(0);
  };

  const from = onTable?.from ?? "hand";

  return (
    // At least a full screen tall (less the nav and the main's top padding),
    // with the hand pushed to the bottom, so a tucked hand sinks off the
    // screen's edge. Clipped top-to-bottom (overflow-y: clip) so the cards
    // below the edge are truly cut off, not left as blank space to scroll
    // into. (This page has no footer for the same reason.)
    <div className="mx-auto flex min-h-[calc(100dvh-53px)] max-w-5xl flex-col overflow-y-clip px-4 pt-3 sm:px-6">
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
              {onTable ? (
                <>
                  <motion.div
                    key={`${onTable.movie.id}-${dealKey}`}
                    className="w-[116px] shrink-0 [perspective:900px] sm:w-[124px]"
                    initial={{ ...DEAL_FROM[from], opacity: 0 }}
                    animate={{ x: 0, y: 0, scale: 1, rotate: -3, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 240, damping: 24 }}
                  >
                    <motion.div
                      className="relative [transform-style:preserve-3d]"
                      initial={{ rotateY: from === "hand" ? 0 : 180 }}
                      animate={{ rotateY: 0 }}
                      transition={{ duration: 0.65, delay: 0.12, ease: [0.3, 0.7, 0.3, 1] }}
                    >
                      <div className="[backface-visibility:hidden]">
                        <MovieCard
                          movie={onTable.movie}
                          watched={tableWatched}
                          className="shadow-[0_14px_30px_rgb(0_0_0/0.55)]"
                        />
                      </div>
                      {from !== "hand" && (
                        <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden]">
                          <CardBack className="shadow-[0_14px_30px_rgb(0_0_0/0.55)]" />
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                  <motion.div
                    key={`details-${onTable.movie.id}-${dealKey}`}
                    // Set a size smaller (zoom, so it takes up less room too),
                    // keeping even the longest placard clear of the gold line.
                    className="broadside w-full max-w-[460px] px-4 py-2.5 [zoom:0.88]"
                    initial={{ opacity: 0, y: 12, rotate: 1 }}
                    animate={{ opacity: 1, y: 0, rotate: 0.6 }}
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
                          <Button variant="secondary" size="sm" className="gap-1.5" onClick={clearTable}>
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
                          <Button variant="secondary" size="sm" className="gap-1.5" onClick={clearTable}>
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
                  </motion.div>
                </>
              ) : (
                <div className="flex aspect-[5/7] w-[120px] items-center justify-center rounded-[10px] border-2 border-dashed border-gold/60 p-3 text-center">
                  <span className="font-slab text-[10px] leading-relaxed tracking-[0.2em] text-gold-light/80 uppercase">
                    Play a Card Here
                  </span>
                </div>
              )}
            </CasinoTable>
          </div>

          <div className="mt-auto pt-2">
            {movies.length > 0 ? (
              <WatchDeckHand
                movies={hand}
                watchedIds={watchedIds}
                tucked
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

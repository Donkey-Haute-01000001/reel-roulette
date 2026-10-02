"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Bookmark, Shuffle, Trash2, Undo2, X } from "lucide-react";

import type { Movie, WatchlistEntry } from "@/lib/types";
import { addToWatchlist, fetchWatchlist, removeFromWatchlist } from "@/lib/watchlist-client";
import { isSupabaseConfigured } from "@/lib/supabase";
import { BroadsideBanner } from "@/components/broadside";
import { CardBack } from "@/components/card-back";
import { CasinoTable } from "@/components/casino-table";
import { MovieCard } from "@/components/movie-card";
import { MovieDetails } from "@/components/movie-details";
import { WatchDeckHand } from "@/components/watch-deck-hand";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { shuffle } from "@/lib/utils";

// Where the card on the table came from:
// - "hand":  played face-up from your hand (slides up from below)
// - "deck":  dealt face-down off your deck on the felt (flies in from the right, flips)
// - "house": Hit me — a card you haven't saved yet (flies in from the dealer's side, flips)
type Source = "hand" | "deck" | "house";

const DEAL_FROM: Record<Source, { x: number; y: number; rotate: number; scale: number }> = {
  hand: { x: 0, y: 220, rotate: -12, scale: 0.6 },
  deck: { x: 420, y: -30, rotate: 28, scale: 0.45 },
  house: { x: 0, y: -280, rotate: -24, scale: 0.45 },
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

  const load = React.useCallback(() => {
    fetchWatchlist().then(setEntries);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const movies = React.useMemo(() => (entries ?? []).map((e) => e.movies), [entries]);
  const savedIds = React.useMemo(() => new Set(movies.map((m) => m.id)), [movies]);

  const pendingMovie =
    pendingPlayId !== null ? (movies.find((m) => m.id === pendingPlayId) ?? null) : null;
  const onTable = table ?? (pendingMovie ? { movie: pendingMovie, from: "hand" as const } : null);
  const inDeck = onTable !== null && savedIds.has(onTable.movie.id);

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

  const from = onTable?.from ?? "hand";

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
      <BroadsideBanner
        className="mb-5"
        kicker="The Card Room"
        lead="Your Personal"
        title="Watch Deck"
        subtitle="Survey Your Hand · Deal Yourself a Card · Or Ask the Dealer to “Hit Me”"
      />

      {!isSupabaseConfigured && (
        <p className="broadside mx-auto mb-6 max-w-xl px-4 py-3 text-center font-serif text-sm">
          Connect a Supabase project to enable the Watch Deck.
        </p>
      )}

      {entries === null ? (
        <Skeleton className="h-[290px] rounded-[48px] sm:rounded-[140px]" />
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-slab text-[10px] tracking-[0.2em] text-gold-light uppercase">
              {hand.length} {hand.length === 1 ? "Card" : "Cards"} in Hand
            </p>
            <HitMeButton onClick={hitMe} disabled={housePool.length === 0} />
          </div>

          <CasinoTable deckCount={hand.length} onDeal={dealFromHand}>
            {onTable ? (
              <>
                <motion.div
                  key={`${onTable.movie.id}-${dealKey}`}
                  className="w-[150px] shrink-0 [perspective:900px] sm:w-[160px]"
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
                  className="broadside w-full max-w-md px-5 py-4"
                  initial={{ opacity: 0, y: 12, rotate: 1 }}
                  animate={{ opacity: 1, y: 0, rotate: 0.6 }}
                  transition={{ delay: 0.15, duration: 0.35 }}
                >
                  <MovieDetails
                    movie={onTable.movie}
                    kicker={inDeck ? "On the Table" : "Fresh from the House"}
                  />
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
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
                  </div>
                </motion.div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex aspect-[5/7] w-[120px] items-center justify-center rounded-[10px] border-2 border-dashed border-gold/60 p-3">
                  <span className="font-slab text-[10px] leading-relaxed tracking-[0.2em] text-gold-light/80 uppercase">
                    Play a Card Here
                  </span>
                </div>
                <p className="max-w-xs font-serif text-sm text-gold-light/80 italic">
                  {movies.length > 0
                    ? "Lay a card from your hand upon the felt, or deal one from your deck."
                    : "Your deck stands empty. Call upon the dealer to Hit Me for a fresh card."}
                </p>
              </div>
            )}
          </CasinoTable>

          <div className="mt-2">
            {movies.length > 0 ? (
              <WatchDeckHand movies={hand} onPlay={(movie) => play(movie, "hand")} />
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
    </div>
  );
}

// Hit me, with a small printed notice explaining it on hover / focus.
function HitMeButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  const tipId = React.useId();

  return (
    <div className="group relative">
      <Button size="sm" className="gap-1.5" onClick={onClick} disabled={disabled} aria-describedby={tipId}>
        <Shuffle className="size-3.5" /> Hit Me
      </Button>
      <div
        id={tipId}
        role="tooltip"
        className="broadside pointer-events-none absolute top-full right-0 z-50 mt-3 w-64 px-3 py-2 text-left font-serif text-xs leading-snug opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100"
      >
        <span className="font-slab text-[9px] tracking-[0.2em] text-crimson uppercase">Hit Me</span>
        <br />
        {disabled
          ? "Every picture in the house already sits in your deck. The dealer has nothing new to offer."
          : "The dealer draws a fresh card from the house, a picture not yet in your Watch Deck. Should it please you, add it to your deck."}
      </div>
    </div>
  );
}

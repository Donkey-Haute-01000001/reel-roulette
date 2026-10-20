"use client";

import * as React from "react";
import { Shuffle, Undo2 } from "lucide-react";

import type { Genre, Movie } from "@/lib/types";
import { EMPTY_FILTERS, applyFilters, type FilterState } from "@/lib/movie-filters";
import { fetchWatchlist } from "@/lib/watchlist-client";
import { clearSeen, fetchSeenIds, unmarkSeen } from "@/lib/seen-client";
import { fetchWatchedIds, toggleWatchedIn } from "@/lib/watched-client";
import { Button } from "@/components/ui/button";
import { GildedTitle } from "@/components/broadside";
import { FilterBar } from "@/components/filter-bar";
import { SwipeDeck } from "@/components/swipe-deck";
import { ShuffleAllDiscardsDialog } from "@/components/confirm-dialog";

type Played = { saved: number[]; seen: number[] };
const NONE_PLAYED: Played = { saved: [], seen: [] };
type Piles = { seen: Movie[]; saved: Movie[] };
const EMPTY_PILES: Piles = { seen: [], saved: [] };

export function SwipeScreen({ movies, genres }: { movies: Movie[]; genres: Genre[] }) {
  const [filters, setFilters] = React.useState(EMPTY_FILTERS);
  const [resetKey, setResetKey] = React.useState(0);
  // Never dealt: pictures in the Watch Deck, and pictures swiped left on
  // ("already seen"). Both null while loading.
  const [savedIds, setSavedIds] = React.useState<Set<number> | null>(null);
  const [seenIds, setSeenIds] = React.useState<Set<number> | null>(null);
  // Played since the deck was last dealt. The deck itself already skips
  // these; they're folded into the sets above the next time the deck is
  // rebuilt anyway (new filters, reshuffle), rather than on every swipe.
  const [playedSinceDeal, setPlayedSinceDeal] = React.useState<Played>(NONE_PLAYED);
  // This session's piles: everything swiped since you came to the page.
  // Kept here, not in the deck, so they last through reshuffles and new
  // filters; they clear when you leave the page.
  const [piles, setPiles] = React.useState<Piles>(EMPTY_PILES);
  const [confirmAllOpen, setConfirmAllOpen] = React.useState(false);
  // Pictures marked "Seen It". Doesn't hold up dealing: cards just gain
  // their turned-down corner once it loads.
  const [watchedIds, setWatchedIds] = React.useState<Set<number>>(() => new Set());

  React.useEffect(() => {
    fetchWatchlist().then((entries) => setSavedIds(new Set(entries.map((e) => e.movie_id))));
    fetchSeenIds().then(setSeenIds);
    fetchWatchedIds().then(setWatchedIds);
  }, []);

  const foldInPlayed = () => {
    if (playedSinceDeal.saved.length > 0) {
      setSavedIds((prev) => new Set([...(prev ?? []), ...playedSinceDeal.saved]));
    }
    if (playedSinceDeal.seen.length > 0) {
      setSeenIds((prev) => new Set([...(prev ?? []), ...playedSinceDeal.seen]));
    }
    setPlayedSinceDeal(NONE_PLAYED);
  };

  const changeFilters = (next: FilterState) => {
    foldInPlayed();
    setFilters(next);
  };

  const reshuffle = () => {
    foldInPlayed();
    setResetKey((k) => k + 1);
  };

  // This session's discard pile goes back into the deck, and a fresh deck
  // is dealt with them in it.
  const shuffleSessionBack = () => {
    const ids = new Set(piles.seen.map((m) => m.id));
    void unmarkSeen([...ids]);
    if (playedSinceDeal.saved.length > 0) {
      setSavedIds((prev) => new Set([...(prev ?? []), ...playedSinceDeal.saved]));
    }
    setSeenIds((prev) => {
      const next = new Set([...(prev ?? []), ...playedSinceDeal.seen]);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    setPlayedSinceDeal(NONE_PLAYED);
    setPiles((prev) => ({ ...prev, seen: [] }));
    setResetKey((k) => k + 1);
  };

  // Every discard, ever, goes back in (asked first: see the dialog below).
  const shuffleAllBack = async () => {
    await clearSeen();
    if (playedSinceDeal.saved.length > 0) {
      setSavedIds((prev) => new Set([...(prev ?? []), ...playedSinceDeal.saved]));
    }
    setPlayedSinceDeal(NONE_PLAYED);
    setSeenIds(new Set());
    setPiles((prev) => ({ ...prev, seen: [] }));
    setResetKey((k) => k + 1);
  };

  const loading = savedIds === null || seenIds === null;
  const matching = React.useMemo(() => applyFilters(movies, filters), [movies, filters]);
  const dealable = React.useMemo(
    () =>
      savedIds && seenIds
        ? matching.filter((m) => !savedIds.has(m.id) && !seenIds.has(m.id))
        : [],
    [matching, savedIds, seenIds]
  );

  const handleSave = React.useCallback((movie: Movie) => {
    setPlayedSinceDeal((prev) => ({ ...prev, saved: [...prev.saved, movie.id] }));
  }, []);
  const handleSeen = React.useCallback((movie: Movie) => {
    setPlayedSinceDeal((prev) => ({ ...prev, seen: [...prev.seen, movie.id] }));
  }, []);
  const handleLand = React.useCallback((movie: Movie, direction: "left" | "right") => {
    setPiles((prev) =>
      direction === "right"
        ? { ...prev, saved: [...prev.saved, movie] }
        : { ...prev, seen: [...prev.seen, movie] }
    );
  }, []);
  const toggleWatched = (movie: Movie) => setWatchedIds(toggleWatchedIn(watchedIds, movie.id));

  const seenCount = (seenIds?.size ?? 0) + playedSinceDeal.seen.length;
  const remaining = dealable.length - playedSinceDeal.saved.length - playedSinceDeal.seen.length;

  // Only offered once there's nothing left to deal, and it asks first. It
  // sits on the paper empty-deck panel, so it's inked in the discard pile's
  // red rather than the outline button's cream.
  const shuffleAllButton =
    seenCount > 0 ? (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setConfirmAllOpen(true)}
        className="h-7 gap-1.5 border-crimson/60 text-crimson hover:bg-crimson/10"
        title="Return every discarded picture to the deck"
      >
        <Undo2 className="size-3.5" /> Shuffle All Discards Back In
      </Button>
    ) : null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-3 sm:px-6">
      {/* Right means "I'd watch this"; left is for pictures you don't fancy.
          Signposts match the piles. */}
      <GildedTitle
        className="mb-3"
        title="Swipe"
        tagline={loading ? "Would you watch it?" : `Would you watch it? · ${remaining} remain`}
        left={["Discard ·", "not for me"]}
        right={["Keep ·", "want to watch"]}
      />

      <div className="mb-6">
        <FilterBar genres={genres} value={filters} onChange={changeFilters} />
        <div className="mt-3 flex justify-center">
          <Button variant="secondary" size="sm" onClick={reshuffle} className="h-7 gap-1.5">
            <Shuffle className="size-3.5" /> Reshuffle
          </Button>
        </div>
      </div>

      {/* Once the card has grown as tall as it goes, a taller screen's spare
          height is shared above and below it, rather than all piling up
          under the buttons. */}
      <div className="flex flex-1 flex-col justify-center">
        <SwipeDeck
          key={resetKey}
          movies={dealable}
          loading={loading}
          emptyTitle={matching.length > 0 ? "All Spoken For" : "No Pictures Match"}
          emptyBody={
            matching.length > 0
              ? "Every picture that matches is already kept in your Watch Deck or in the discard pile."
              : "Pray widen your genre or mood selections."
          }
          emptyAction={shuffleAllButton}
          onSave={handleSave}
          onSeen={handleSeen}
          piles={piles}
          onLand={handleLand}
          onShuffleBack={shuffleSessionBack}
          watchedIds={watchedIds}
          onToggleWatched={toggleWatched}
        />
      </div>

      <ShuffleAllDiscardsDialog
        open={confirmAllOpen}
        onOpenChange={setConfirmAllOpen}
        count={seenCount}
        onConfirm={shuffleAllBack}
      />
    </div>
  );
}

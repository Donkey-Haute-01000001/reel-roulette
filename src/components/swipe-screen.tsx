"use client";

import * as React from "react";
import { Eye, Shuffle } from "lucide-react";

import type { Genre, Movie } from "@/lib/types";
import { EMPTY_FILTERS, applyFilters, type FilterState } from "@/lib/movie-filters";
import { fetchWatchlist } from "@/lib/watchlist-client";
import { clearSeen, fetchSeenIds } from "@/lib/seen-client";
import { Button } from "@/components/ui/button";
import { BroadsideBanner } from "@/components/broadside";
import { FilterBar } from "@/components/filter-bar";
import { SwipeDeck } from "@/components/swipe-deck";

type Played = { saved: number[]; seen: number[] };
const NONE_PLAYED: Played = { saved: [], seen: [] };

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
  const [clearing, setClearing] = React.useState(false);

  React.useEffect(() => {
    fetchWatchlist().then((entries) => setSavedIds(new Set(entries.map((e) => e.movie_id))));
    fetchSeenIds().then(setSeenIds);
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

  // Forget every "seen" mark and deal a fresh deck that includes them again.
  const shuffleSeenBackIn = async () => {
    setClearing(true);
    await clearSeen();
    if (playedSinceDeal.saved.length > 0) {
      setSavedIds((prev) => new Set([...(prev ?? []), ...playedSinceDeal.saved]));
    }
    setPlayedSinceDeal(NONE_PLAYED);
    setSeenIds(new Set());
    setResetKey((k) => k + 1);
    setClearing(false);
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

  const seenCount = (seenIds?.size ?? 0) + playedSinceDeal.seen.length;
  const remaining = dealable.length - playedSinceDeal.saved.length - playedSinceDeal.seen.length;

  const shuffleBackButton =
    seenCount > 0 ? (
      <Button
        variant="outline"
        size="sm"
        onClick={shuffleSeenBackIn}
        disabled={clearing}
        className="gap-1.5"
        title="Return every picture you've marked as seen to the deck"
      >
        <Eye className="size-3.5" /> {clearing ? "Shuffling…" : `Shuffle Seen Back In (${seenCount})`}
      </Button>
    ) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
      <BroadsideBanner
        className="mb-4"
        kicker="Grand Picture-Show Lottery"
        lead="Have You Seen It?"
        title="Swipe"
        subtitle={
          loading
            ? "Swipe Right, If It Seems Interesting · Left, If It Doesn’t or You’ve Seen It"
            : `Swipe Right, If It Seems Interesting · Left, If It Doesn’t or You’ve Seen It · ${remaining} Pictures Remain`
        }
      />

      <div className="mb-4">
        <FilterBar genres={genres} value={filters} onChange={changeFilters}>
          <Button variant="secondary" size="sm" onClick={reshuffle} className="gap-1.5">
            <Shuffle className="size-3.5" /> Reshuffle
          </Button>
          {shuffleBackButton}
        </FilterBar>
      </div>

      <SwipeDeck
        key={resetKey}
        movies={dealable}
        loading={loading}
        emptyTitle={matching.length > 0 ? "All Spoken For" : "No Pictures Match"}
        emptyBody={
          matching.length > 0
            ? "Every picture that matches is already in your Watch Deck or marked as seen."
            : "Pray widen your genre or mood selections."
        }
        emptyAction={shuffleBackButton}
        onSave={handleSave}
        onSeen={handleSeen}
      />
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import type { Genre, Movie, WatchlistEntry } from "@/lib/types";
import { addToWatchlist, fetchWatchlist } from "@/lib/watchlist-client";
import { fetchSeenIds, markSeen } from "@/lib/seen-client";
import { fetchWatchedIds, toggleWatchedIn } from "@/lib/watched-client";
import { GildedTitle } from "@/components/broadside";
import { RouletteSlot } from "@/components/roulette-slot";

export function RouletteScreen({ catalog, genres }: { catalog: Movie[]; genres: Genre[] }) {
  const router = useRouter();
  const [entries, setEntries] = React.useState<WatchlistEntry[]>([]);
  // Discarded pictures (swiped left, or passed on here) stay out of
  // catalogue spins until they're shuffled back in on the Swipe page.
  const [seenIds, setSeenIds] = React.useState<Set<number>>(() => new Set());
  const [watchedIds, setWatchedIds] = React.useState<Set<number>>(() => new Set());

  React.useEffect(() => {
    fetchWatchlist().then(setEntries);
    fetchSeenIds().then(setSeenIds);
    fetchWatchedIds().then(setWatchedIds);
  }, []);

  const deckMovies = React.useMemo(() => entries.map((e) => e.movies), [entries]);
  const savedIds = React.useMemo(() => new Set(deckMovies.map((m) => m.id)), [deckMovies]);
  const spinCatalog = React.useMemo(
    () => (seenIds.size > 0 ? catalog.filter((m) => !seenIds.has(m.id)) : catalog),
    [catalog, seenIds]
  );

  const handlePass = (movie: Movie) => {
    void markSeen(movie.id);
    setSeenIds((prev) => new Set(prev).add(movie.id));
  };
  const toggleWatched = (movie: Movie) => setWatchedIds(toggleWatchedIn(watchedIds, movie.id));

  // Adding a spin result sends you straight to the Watch Deck with that card
  // already played to the table.
  const handleSave = async (movie: Movie) => {
    const ok = await addToWatchlist(movie.id);
    if (ok) router.push(`/watchlist?play=${movie.id}`);
    return ok;
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pt-1 pb-3 sm:px-6 [@media(min-width:1536px)_and_(min-height:900px)]:max-w-6xl">
      <GildedTitle className="mb-2"title="Spin" tagline="Three spins · one flick" />
      {/* Spare height on a tall screen goes above and below the machine,
          not all of it under it. */}
      <div className="flex flex-1 flex-col justify-center">
        <RouletteSlot
          deckMovies={deckMovies}
          catalog={spinCatalog}
          genres={genres}
          savedIds={savedIds}
          watchedIds={watchedIds}
          onSave={handleSave}
          onPass={handlePass}
          onToggleWatched={toggleWatched}
        />
      </div>
    </div>
  );
}

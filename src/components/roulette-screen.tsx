"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import type { Genre, Movie, WatchlistEntry } from "@/lib/types";
import { addToWatchlist, fetchWatchlist } from "@/lib/watchlist-client";
import { GildedTitle } from "@/components/broadside";
import { RouletteSlot } from "@/components/roulette-slot";

export function RouletteScreen({ catalog, genres }: { catalog: Movie[]; genres: Genre[] }) {
  const router = useRouter();
  const [entries, setEntries] = React.useState<WatchlistEntry[]>([]);

  React.useEffect(() => {
    fetchWatchlist().then(setEntries);
  }, []);

  const deckMovies = React.useMemo(() => entries.map((e) => e.movies), [entries]);
  const savedIds = React.useMemo(() => new Set(deckMovies.map((m) => m.id)), [deckMovies]);

  // Adding a spin result sends you straight to the Watch Deck with that card
  // already played to the table.
  const handleSave = async (movie: Movie) => {
    const ok = await addToWatchlist(movie.id);
    if (ok) router.push(`/watchlist?play=${movie.id}`);
    return ok;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
      <GildedTitle className="mb-4" title="Spin" tagline="Three spins · one flick" />
      <RouletteSlot
        deckMovies={deckMovies}
        catalog={catalog}
        genres={genres}
        savedIds={savedIds}
        onSave={handleSave}
      />
    </div>
  );
}

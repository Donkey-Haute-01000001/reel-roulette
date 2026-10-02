"use client";

import * as React from "react";
import { Shuffle } from "lucide-react";

import type { Genre, Movie } from "@/lib/types";
import { EMPTY_FILTERS, applyFilters } from "@/lib/movie-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/filter-bar";
import { SwipeDeck } from "@/components/swipe-deck";

export function RouletteScreen({ movies, genres }: { movies: Movie[]; genres: Genre[] }) {
  const [filters, setFilters] = React.useState(EMPTY_FILTERS);
  const [resetKey, setResetKey] = React.useState(0);

  const filtered = React.useMemo(() => applyFilters(movies, filters), [movies, filters]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 text-center">
        <Badge className="mb-3">{movies.length} movies in the pool</Badge>
        <h1 className="text-4xl font-black sm:text-5xl">Can&apos;t decide what to watch?</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Spin the deck, swipe right to save a pick, swipe left to reroll. Narrow it down first
          if you&apos;re in a specific mood.
        </p>
      </div>

      <div className="mb-8">
        <FilterBar genres={genres} value={filters} onChange={setFilters}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setResetKey((k) => k + 1)}
            className="gap-1.5"
          >
            <Shuffle className="size-3.5" /> Reshuffle
          </Button>
        </FilterBar>
      </div>

      <SwipeDeck key={resetKey} movies={filtered} />
    </div>
  );
}

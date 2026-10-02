"use client";

import * as React from "react";
import Link from "next/link";
import { Dices, Hand, LayoutGrid, Layers, Shuffle, Trash2 } from "lucide-react";

import type { Genre, Movie, WatchlistEntry } from "@/lib/types";
import { addToWatchlist, fetchWatchlist, removeFromWatchlist } from "@/lib/watchlist-client";
import { isSupabaseConfigured } from "@/lib/supabase";
import { EMPTY_FILTERS, applyFilters } from "@/lib/movie-filters";
import { FilterBar } from "@/components/filter-bar";
import { MovieCard } from "@/components/movie-card";
import { RouletteSlot } from "@/components/roulette-slot";
import { WatchDeckFan } from "@/components/watch-deck-fan";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { shuffle } from "@/lib/utils";

type View = "fan" | "grid";

export function WatchDeckScreen({ catalog, genres }: { catalog: Movie[]; genres: Genre[] }) {
  const [entries, setEntries] = React.useState<WatchlistEntry[] | null>(null);
  const [view, setView] = React.useState<View>("fan");
  const [focusIndex, setFocusIndex] = React.useState(0);
  const [highlightKey, setHighlightKey] = React.useState(0);
  const [pickOpen, setPickOpen] = React.useState(false);
  const [pickFilters, setPickFilters] = React.useState(EMPTY_FILTERS);

  const load = React.useCallback(() => {
    fetchWatchlist().then(setEntries);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const movies = React.useMemo(() => (entries ?? []).map((e) => e.movies), [entries]);
  const savedIds = React.useMemo(() => new Set(movies.map((m) => m.id)), [movies]);
  const pickPool = React.useMemo(() => applyFilters(movies, pickFilters), [movies, pickFilters]);

  // Keep the focus in range as cards are removed.
  const safeFocus = Math.min(focusIndex, Math.max(0, movies.length - 1));

  const handleRemove = async (movieId: number) => {
    setEntries((prev) => (prev ? prev.filter((e) => e.movie_id !== movieId) : prev));
    await removeFromWatchlist(movieId);
  };

  const handleSave = async (movie: Movie) => {
    if (await addToWatchlist(movie.id)) load();
  };

  // Draw a random card from `pool` and reveal it in the fan. Avoids
  // re-drawing the card that's already focused when there's any choice.
  const draw = (pool: Movie[]) => {
    if (pool.length === 0) return;
    const current = movies[safeFocus];
    const candidates = pool.length > 1 ? pool.filter((m) => m.id !== current?.id) : pool;
    const picked = shuffle(candidates)[0];
    setView("fan");
    setFocusIndex(movies.findIndex((m) => m.id === picked.id));
    setHighlightKey((k) => k + 1);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 text-center">
        <Badge className="mb-3">
          <Layers className="size-3" /> Your Watch Deck
        </Badge>
        <h1 className="text-4xl font-black sm:text-5xl">Your hand of picks</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Every card you&apos;ve saved, on this browser only. Flip through them, draw one at
          random, or take your chances on the Roulette below.
        </p>
      </div>

      {!isSupabaseConfigured && (
        <p className="mx-auto mb-8 max-w-xl rounded-xl border border-dashed border-border bg-card px-4 py-3 text-center text-sm text-muted-foreground">
          Connect a Supabase project to enable the Watch Deck.
        </p>
      )}

      {entries === null && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      )}

      {entries !== null && entries.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-20 text-center">
          <p className="font-display text-xl font-bold">Your Watch Deck is empty</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Swipe right on the roulette to add cards, or spin the whole catalog below.
          </p>
          <Button asChild>
            <Link href="/">Start swiping</Link>
          </Button>
        </div>
      )}

      {entries !== null && entries.length > 0 && (
        <section aria-label="Watch Deck">
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
            <Segmented
              label="Watch Deck layout"
              value={view}
              onChange={setView}
              options={[
                { value: "fan", label: <><Hand /> Fan</> },
                { value: "grid", label: <><LayoutGrid /> Grid</> },
              ]}
            />
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => draw(movies)}>
              <Shuffle className="size-3.5" /> Hit me
            </Button>
            <Button
              variant={pickOpen ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              aria-expanded={pickOpen}
              onClick={() => setPickOpen((v) => !v)}
            >
              <Layers className="size-3.5" /> Pick a card
            </Button>
          </div>

          {pickOpen && (
            <div className="mx-auto mb-6 flex max-w-3xl flex-col items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <FilterBar genres={genres} value={pickFilters} onChange={setPickFilters} />
              <div className="flex flex-wrap items-center justify-center gap-3">
                <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {pickPool.length} of {movies.length} cards match
                </span>
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={pickPool.length === 0}
                  onClick={() => draw(pickPool)}
                >
                  <Dices className="size-3.5" /> Draw
                </Button>
              </div>
              {pickPool.length === 0 && (
                <p role="status" className="text-sm text-muted-foreground">
                  No cards in your Watch Deck match these filters.
                </p>
              )}
            </div>
          )}

          {view === "fan" ? (
            <div className="flex flex-col items-center">
              <WatchDeckFan
                movies={movies}
                focusIndex={safeFocus}
                onFocusChange={setFocusIndex}
                highlightKey={highlightKey}
              />
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => handleRemove(movies[safeFocus].id)}
              >
                <Trash2 className="size-3.5" /> Remove card
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {movies.map((movie) => (
                <div key={movie.id} className="flex flex-col gap-2">
                  <MovieCard movie={movie} size="compact" className="h-[390px]" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemove(movie.id)}
                  >
                    <Trash2 className="size-3.5" /> Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section id="roulette" aria-labelledby="roulette-heading" className="mt-16 border-t border-border pt-12">
        <div className="mb-6 text-center">
          <Badge className="mb-3">
            <Dices className="size-3" /> Roulette
          </Badge>
          <h2 id="roulette-heading" className="text-3xl font-black sm:text-4xl">
            Let the reels decide
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Three reels, one movie. Spin your Watch Deck or the whole catalog, and line up
            tonight&apos;s pick. You get three spins a day.
          </p>
        </div>
        <RouletteSlot
          deckMovies={movies}
          catalog={catalog}
          genres={genres}
          savedIds={savedIds}
          onSave={handleSave}
        />
      </section>
    </div>
  );
}

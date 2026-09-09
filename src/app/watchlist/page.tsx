"use client";

import * as React from "react";
import { Bookmark, Clock, Star, Trash2, User } from "lucide-react";
import Link from "next/link";

import type { WatchlistEntry } from "@/lib/types";
import { fetchWatchlist, removeFromWatchlist } from "@/lib/watchlist-client";
import { isSupabaseConfigured } from "@/lib/supabase";
import { GENRE_META } from "@/lib/genre-meta";
import { MoviePoster } from "@/components/movie-poster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function WatchlistPage() {
  const [entries, setEntries] = React.useState<WatchlistEntry[] | null>(null);

  const load = React.useCallback(() => {
    fetchWatchlist().then(setEntries);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleRemove = async (movieId: number) => {
    setEntries((prev) => (prev ? prev.filter((e) => e.movie_id !== movieId) : prev));
    await removeFromWatchlist(movieId);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 text-center">
        <Badge className="mb-3">
          <Bookmark className="size-3" /> Your Watchlist
        </Badge>
        <h1 className="text-4xl font-black sm:text-5xl">Everything you&apos;ve saved</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Saved on this browser only — swipe right on the roulette to add more.
        </p>
      </div>

      {!isSupabaseConfigured && (
        <p className="mx-auto mb-8 max-w-xl rounded-xl border border-dashed border-border bg-card px-4 py-3 text-center text-sm text-muted-foreground">
          Connect a Supabase project to enable the watchlist.
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
          <p className="font-display text-xl font-bold">Nothing saved yet</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Go spin the roulette and swipe right on something that looks good.
          </p>
          <Button asChild>
            <Link href="/">Start spinning</Link>
          </Button>
        </div>
      )}

      {entries !== null && entries.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => {
            const movie = entry.movies;
            const meta = GENRE_META[movie.primary_genre];
            return (
              <div
                key={entry.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
              >
                <MoviePoster
                  genre={movie.primary_genre}
                  title={movie.title}
                  year={movie.release_year}
                  className="h-40"
                />
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-center gap-2">
                    <Badge style={{ background: meta.color, color: "#0a0a0c", borderColor: "transparent" }}>
                      {meta.label}
                    </Badge>
                    <span className="ml-auto inline-flex items-center gap-1 text-sm font-bold">
                      <Star className="size-3.5 fill-current text-primary" />
                      {movie.rating.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <User className="size-3.5" /> {movie.director}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" /> {movie.runtime_minutes} min
                    </span>
                  </div>
                  <p className="line-clamp-3 text-sm text-muted-foreground">{movie.synopsis}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-auto gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemove(movie.id)}
                  >
                    <Trash2 className="size-3.5" /> Remove
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

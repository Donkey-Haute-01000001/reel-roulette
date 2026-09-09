"use client";

import * as React from "react";
import { Shuffle } from "lucide-react";

import type { Genre, GenreSlug, Movie } from "@/lib/types";
import { GENRE_META, MOOD_TAGS } from "@/lib/genre-meta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SwipeDeck } from "@/components/swipe-deck";
import { cn } from "@/lib/utils";

const RUNTIME_OPTIONS = [
  { label: "Any length", value: "any" },
  { label: "Under 100 min", value: "100" },
  { label: "Under 130 min", value: "130" },
  { label: "Under 160 min", value: "160" },
];

export function RouletteScreen({ movies, genres }: { movies: Movie[]; genres: Genre[] }) {
  const [activeGenres, setActiveGenres] = React.useState<GenreSlug[]>([]);
  const [mood, setMood] = React.useState<string>("any");
  const [maxRuntime, setMaxRuntime] = React.useState<string>("any");
  const [resetKey, setResetKey] = React.useState(0);

  const toggleGenre = (slug: GenreSlug) => {
    setActiveGenres((prev) =>
      prev.includes(slug) ? prev.filter((g) => g !== slug) : [...prev, slug]
    );
  };

  const filtered = React.useMemo(() => {
    return movies.filter((m) => {
      const matchesGenre =
        activeGenres.length === 0 || m.genre_slugs.some((g) => activeGenres.includes(g));
      const matchesMood = mood === "any" || m.mood_tags.includes(mood);
      const matchesRuntime = maxRuntime === "any" || m.runtime_minutes <= Number(maxRuntime);
      return matchesGenre && matchesMood && matchesRuntime;
    });
  }, [movies, activeGenres, mood, maxRuntime]);

  const clearFilters = () => {
    setActiveGenres([]);
    setMood("any");
    setMaxRuntime("any");
  };

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

      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex flex-wrap justify-center gap-2">
          {genres.map((g) => {
            const meta = GENRE_META[g.slug];
            const active = activeGenres.includes(g.slug);
            return (
              <button
                key={g.slug}
                onClick={() => toggleGenre(g.slug)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-all",
                  active
                    ? "border-transparent text-[#0a0a0c]"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
                style={active ? { background: meta.color } : undefined}
              >
                {meta.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Select value={mood} onValueChange={setMood}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Mood" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any mood</SelectItem>
              {MOOD_TAGS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m.replace(/-/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={maxRuntime} onValueChange={setMaxRuntime}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Runtime" />
            </SelectTrigger>
            <SelectContent>
              {RUNTIME_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(activeGenres.length > 0 || mood !== "any" || maxRuntime !== "any") && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setResetKey((k) => k + 1)}
            className="gap-1.5"
          >
            <Shuffle className="size-3.5" /> Reshuffle
          </Button>
        </div>
      </div>

      <SwipeDeck key={resetKey} movies={filtered} />
    </div>
  );
}

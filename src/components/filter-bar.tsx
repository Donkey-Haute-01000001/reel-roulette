"use client";

import * as React from "react";

import type { Genre, GenreSlug } from "@/lib/types";
import { GENRE_META, MOOD_TAGS } from "@/lib/genre-meta";
import {
  EMPTY_FILTERS,
  RUNTIME_OPTIONS,
  hasActiveFilters,
  type FilterState,
} from "@/lib/movie-filters";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function FilterBar({
  genres,
  value,
  onChange,
  disabled = false,
  children,
}: {
  genres: Genre[];
  value: FilterState;
  onChange: (next: FilterState) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  const toggleGenre = (slug: GenreSlug) => {
    onChange({
      ...value,
      genres: value.genres.includes(slug)
        ? value.genres.filter((g) => g !== slug)
        : [...value.genres, slug],
    });
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap justify-center gap-2">
        {genres.map((g) => {
          const meta = GENRE_META[g.slug];
          const active = value.genres.includes(g.slug);
          return (
            <button
              key={g.slug}
              disabled={disabled}
              onClick={() => toggleGenre(g.slug)}
              aria-pressed={active}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-50",
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
        <Select
          value={value.mood}
          onValueChange={(mood) => onChange({ ...value, mood })}
          disabled={disabled}
        >
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

        <Select
          value={value.maxRuntime}
          onValueChange={(maxRuntime) => onChange({ ...value, maxRuntime })}
          disabled={disabled}
        >
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

        {hasActiveFilters(value) && (
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => onChange(EMPTY_FILTERS)}
          >
            Clear filters
          </Button>
        )}

        {children}
      </div>
    </div>
  );
}
